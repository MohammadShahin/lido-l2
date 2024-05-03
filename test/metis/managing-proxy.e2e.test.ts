import { assert } from "chai";
import { TransactionResponse } from "@ethersproject/providers";

import {
  ERC20Bridged__factory,
  GovBridgeExecutor__factory,
  OssifiableProxy__factory,
  L2ERC20TokenBridgeMetis__factory,
  AragonAgentMock__factory,
} from "../../typechain";
import { E2E_TEST_CONTRACTS_METIS as E2E_TEST_CONTRACTS } from "../../utils/testing/e2e";
import env from "../../utils/env";
import network from "../../utils/network";
import { scenario } from "../../utils/testing";
import metis from "../../utils/metis";

let ossifyMessageResponse: TransactionResponse;
let upgradeMessageResponse: TransactionResponse;

scenario(
  "Metis :: AAVE governance crosschain bridge: proxy management",
  ctxFactory
)
  .step("Check OssifiableProxy deployed correct", async (ctx) => {
    const { proxyToOssify } = ctx;
    const admin = await proxyToOssify.proxy__getAdmin();

    assert.equal(admin, E2E_TEST_CONTRACTS.l2.govBridgeExecutor);
  })

  .step("Proxy upgrade: send crosschain message", async (ctx) => {
    const implBefore = await ctx.proxyToOssify.proxy__getImplementation();

    assert.equal(implBefore, ctx.l2ERC20TokenBridge.address);
    const executorCalldata = ctx.govBridgeExecutor.interface.encodeFunctionData(
      "queue",
      [
        [ctx.proxyToOssify.address],
        [0],
        ["proxy__upgradeTo(address)"],
        [
          "0x" +
            ctx.proxyToOssify.interface
              .encodeFunctionData("proxy__upgradeTo", [ctx.l2Token.address])
              .substring(10),
        ],
        [false],
      ]
    );

    const { calldata, callvalue } = ctx.messaging.prepareL2Message({
      sender: ctx.lidoAragonDAOMock.address,
      recipient: ctx.govBridgeExecutor.address,
      calldata: executorCalldata,
    });

    const transferTx = await ctx.l1Tester.sendTransaction({
      to: ctx.lidoAragonDAOMock.address,
      value: callvalue,
    });

    await transferTx.wait();

    upgradeMessageResponse = await ctx.lidoAragonDAOMock.execute(
      ctx.mtsAddresses.L1CrossDomainMessenger,
      callvalue,
      calldata
    );

    await upgradeMessageResponse.wait();
  })

  .step("Proxy upgrade: wait for relay", async ({ messaging }) => {
    await messaging.waitForL2Message(upgradeMessageResponse.hash);
  })

  .step(
    "Proxy upgrade: execute",
    async ({ proxyToOssify, govBridgeExecutor, l2Token }) => {
      const taskId =
        (await govBridgeExecutor.getActionsSetCount()).toNumber() - 1;

      const executeTx = await govBridgeExecutor.execute(taskId);
      await executeTx.wait();
      const implAfter = await proxyToOssify.proxy__getImplementation();

      assert(implAfter, l2Token.address);
    }
  )

  .step("Proxy ossify: send crosschain message", async (ctx) => {
    const isOssifiedBefore = await ctx.proxyToOssify.proxy__getIsOssified();

    assert.isFalse(isOssifiedBefore);

    const executorCalldata = ctx.govBridgeExecutor.interface.encodeFunctionData(
      "queue",
      [[ctx.proxyToOssify.address], [0], ["proxy__ossify()"], ["0x00"], [false]]
    );

    const { calldata, callvalue } = ctx.messaging.prepareL2Message({
      sender: ctx.lidoAragonDAOMock.address,
      recipient: ctx.govBridgeExecutor.address,
      calldata: executorCalldata,
    });

    const transferTx = await ctx.l1Tester.sendTransaction({
      to: ctx.lidoAragonDAOMock.address,
      value: callvalue,
    });

    await transferTx.wait();

    ossifyMessageResponse = await ctx.lidoAragonDAOMock.execute(
      ctx.mtsAddresses.L1CrossDomainMessenger,
      callvalue,
      calldata
    );

    await ossifyMessageResponse.wait();
  })

  .step("Proxy ossify: wait for relay", async ({ messaging }) => {
    await messaging.waitForL2Message(ossifyMessageResponse.hash);
  })

  .step(
    "Proxy ossify: execute",
    async ({ govBridgeExecutor, proxyToOssify }) => {
      const taskId =
        (await govBridgeExecutor.getActionsSetCount()).toNumber() - 1;
      const executeTx = await govBridgeExecutor.execute(taskId, {
        gasLimit: 2000000,
      });
      await executeTx.wait();

      const isOssifiedAfter = await proxyToOssify.proxy__getIsOssified();

      assert.isTrue(isOssifiedAfter);
    }
  )

  .run();

async function ctxFactory() {
  const networkName = "sepolia";
  const ethMtsNetwork = network.multichain(["eth", "mts"], networkName);

  const [l1Tester, l2Tester] = ethMtsNetwork.getSigners(
    env.string("TESTING_PRIVATE_KEY"),
    { forking: false }
  );

  const lidoAragonDAOMockAddress = env.address(
    "TESTING_MTS_LIDO_DAO_MOCK",
    "0x"
  );
  const lidoAragonDAOMock = AragonAgentMock__factory.connect(
    lidoAragonDAOMockAddress,
    l1Tester
  );

  const mtsAddresses = metis.addresses(networkName);

  return {
    lidoAragonDAOMock,
    messaging: metis.messaging(networkName, { forking: false }),
    mtsAddresses,
    l1Tester,
    l2Tester,
    l2Token: ERC20Bridged__factory.connect(
      E2E_TEST_CONTRACTS.l2.l2Token,
      l2Tester
    ),
    l2ERC20TokenBridge: L2ERC20TokenBridgeMetis__factory.connect(
      E2E_TEST_CONTRACTS.l2.l2ERC20TokenBridge,
      l2Tester
    ),
    govBridgeExecutor: GovBridgeExecutor__factory.connect(
      E2E_TEST_CONTRACTS.l2.govBridgeExecutor,
      l2Tester
    ),
    proxyToOssify: await new OssifiableProxy__factory(l2Tester).deploy(
      E2E_TEST_CONTRACTS.l2.l2ERC20TokenBridge,
      E2E_TEST_CONTRACTS.l2.govBridgeExecutor,
      "0x"
    ),
  };
}
