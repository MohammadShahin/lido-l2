import { assert } from "chai";
import { Overrides, Wallet } from "ethers";
import {
  ERC20Bridged__factory,
  IERC20Metadata__factory,
  L1ERC20TokenBridgeMetis__factory,
  L2ERC20TokenBridgeMetis__factory,
  OssifiableProxy__factory,
  ERC20BridgedPermit__factory,
} from "../../typechain";

import addresses from "./addresses";
import { CommonOptions } from "./types";
import network, { NetworkName } from "../network";
import { DeployScript, Logger } from "../deployment/DeployScript";

interface MtsL1DeployScriptParams {
  deployer: Wallet;
  admins: { proxy: string; bridge: string };
}

interface MtsL2DeployScriptParams extends MtsL1DeployScriptParams {
  l2Token?: { name?: string; symbol?: string; isTokenWithPermit?: boolean };
}

interface MtsDeploymentOptions extends CommonOptions {
  logger?: Logger;
  overrides?: Overrides;
}

export default function deployment(
  networkName: NetworkName,
  options: MtsDeploymentOptions = {}
) {
  const mtsAddresses = addresses(networkName, options);
  const l2ChainId = network.chainId("mts", networkName);
  return {
    async erc20TokenBridgeDeployScript(
      l1Token: string,
      l1Params: MtsL1DeployScriptParams,
      l2Params: MtsL2DeployScriptParams
    ) {
      const [
        expectedL1TokenBridgeImplAddress,
        expectedL1TokenBridgeProxyAddress,
      ] = await network.predictAddresses(l1Params.deployer, 2);

      const [
        expectedL2TokenImplAddress,
        expectedL2TokenProxyAddress,
        expectedL2TokenBridgeImplAddress,
        expectedL2TokenBridgeProxyAddress,
      ] = await network.predictAddresses(l2Params.deployer, 4);

      const l1DeployScript = new DeployScript(
        l1Params.deployer,
        options?.logger
      )
        .addStep({
          factory: L1ERC20TokenBridgeMetis__factory,
          args: [
            mtsAddresses.L1CrossDomainMessenger,
            expectedL2TokenBridgeProxyAddress,
            l1Token,
            expectedL2TokenProxyAddress,
            mtsAddresses.AddressManager,
            l2ChainId,
            options?.overrides,
          ],
          afterDeploy: (c) =>
            assert.equal(c.address, expectedL1TokenBridgeImplAddress),
        })
        .addStep({
          factory: OssifiableProxy__factory,
          args: [
            expectedL1TokenBridgeImplAddress,
            l1Params.admins.proxy,
            L1ERC20TokenBridgeMetis__factory.createInterface().encodeFunctionData(
              "initialize",
              [l1Params.admins.bridge]
            ),
            options?.overrides,
          ],
          afterDeploy: (c) =>
            assert.equal(c.address, expectedL1TokenBridgeProxyAddress),
        });

      const l1TokenInfo = IERC20Metadata__factory.connect(
        l1Token,
        l1Params.deployer
      );

      const [decimals, l2TokenName, l2TokenSymbol] = await Promise.all([
        l1TokenInfo.decimals(),
        l2Params.l2Token?.name ?? l1TokenInfo.name(),
        l2Params.l2Token?.symbol ?? l1TokenInfo.symbol(),
      ]);

      const TokenFactory = l2Params.l2Token?.isTokenWithPermit
        ? ERC20BridgedPermit__factory
        : ERC20Bridged__factory;
      const l2DeployScript = new DeployScript(
        l2Params.deployer,
        options?.logger
      )
        .addStep({
          factory: TokenFactory,
          args: [
            l2TokenName,
            l2TokenSymbol,
            decimals,
            expectedL2TokenBridgeProxyAddress,
            options?.overrides,
          ],
          afterDeploy: (c) =>
            assert.equal(c.address, expectedL2TokenImplAddress),
        })
        .addStep({
          factory: OssifiableProxy__factory,
          args: [
            expectedL2TokenImplAddress,
            l2Params.admins.proxy,
            TokenFactory.createInterface().encodeFunctionData("initialize", [
              l2TokenName,
              l2TokenSymbol,
            ]),
            options?.overrides,
          ],
          afterDeploy: (c) =>
            assert.equal(c.address, expectedL2TokenProxyAddress),
        })
        .addStep({
          factory: L2ERC20TokenBridgeMetis__factory,
          args: [
            mtsAddresses.L2CrossDomainMessenger,
            expectedL1TokenBridgeProxyAddress,
            l1Token,
            expectedL2TokenProxyAddress,
            options?.overrides,
          ],
          afterDeploy: (c) =>
            assert.equal(c.address, expectedL2TokenBridgeImplAddress),
        })
        .addStep({
          factory: OssifiableProxy__factory,
          args: [
            expectedL2TokenBridgeImplAddress,
            l2Params.admins.proxy,
            L2ERC20TokenBridgeMetis__factory.createInterface().encodeFunctionData(
              "initialize",
              [l2Params.admins.bridge]
            ),
            options?.overrides,
          ],
        });

      return [l1DeployScript, l2DeployScript];
    },
  };
}
