import { CrossChainMessenger, DAIBridgeAdapter } from "@eth-optimism/sdk";
import { assert } from "chai";
import { TransactionResponse } from "@ethersproject/providers";
import { getContractFactory } from "@eth-optimism/contracts";

import env from "../../utils/env";
import { wei } from "../../utils/wei";
import network from "../../utils/network";
import metis from "../../utils/metis";
import { ERC20Mintable } from "../../typechain";
import { scenario } from "../../utils/testing";

import {
  Direction,
  initWatcher,
  relayXDomainMessages,
  waitForXDomainTransaction,
} from "../../utils/metis/watcher";

let depositTokensTxResponse: TransactionResponse;
let withdrawTokensTxResponse: TransactionResponse;

// This test follows the tests from the Metis repo

scenario("Metis :: Bridging via deposit/withdraw E2E test", ctxFactory)
  .step(
    "Validate tester has required amount of L1 token",
    async ({ l1Token, l1Tester, depositAmount }) => {
      const balanceBefore = await l1Token.balanceOf(l1Tester.address);
      if (balanceBefore.lt(depositAmount)) {
        try {
          await (l1Token as ERC20Mintable).mint(
            l1Tester.address,
            depositAmount
          );
        } catch {}
        const balanceAfter = await l1Token.balanceOf(l1Tester.address);
        assert.isTrue(
          balanceAfter.gte(depositAmount),
          "Tester has not enough L1 token"
        );
      }
    }
  )

  .step("Set allowance for L1ERC20TokenBridge to deposit", async (ctx) => {
    const allowanceTxResponse = await ctx.crossChainMessenger.approveERC20(
      ctx.l1Token.address,
      ctx.l2Token.address,
      ctx.depositAmount
    );

    await allowanceTxResponse.wait();

    assert.equalBN(
      await ctx.l1Token.allowance(
        ctx.l1Tester.address,
        ctx.l1ERC20TokenBridge.address
      ),
      ctx.depositAmount
    );
  })

  .step(
    "Bridge tokens from L1 to L2 via depositERC20ToByChainId",
    async (ctx) => {
      const l2Gas = 5000000;
      depositTokensTxResponse =
        await ctx.l1ERC20TokenBridge.depositERC20ToByChainId(
          ctx.chainIdTo,
          ctx.l1Token.address,
          ctx.l2Token.address,
          ctx.l2Tester.address,
          ctx.depositAmount,
          l2Gas,
          "0x",
          {
            value: wei`0.0025 ether`,
          }
        );

      await depositTokensTxResponse.wait();
    }
  )

  .step("Receipt with a status of 1 for a successful message", async (ctx) => {
    const { remoteReceipt } = await waitForXDomainTransaction(
      ctx.watcher,
      depositTokensTxResponse,
      Direction.L1ToL2
    );
    assert.equal(remoteReceipt.status, 1);
  })

  .step("Withdraw tokens from L2 via withdrawTo", async (ctx) => {
    const l1Gas = 5000000;

    withdrawTokensTxResponse = await ctx.l2ERC20TokenBridge.withdrawTo(
      ctx.l2Token.address,
      ctx.l1Tester.address,
      ctx.withdrawalAmount,
      l1Gas,
      "0x",
      { value: wei.toBigNumber(wei`0.1 ether`) }
    );

    await withdrawTokensTxResponse.wait();
  })

  .step("Relay the L2 => L1 message", async (ctx) => {
    await relayXDomainMessages(
      withdrawTokensTxResponse,
      ctx.l1Provider,
      ctx.l2Provider,
      ctx.l1CrossDomainMessenger,
      ctx.l2CrossDomainMessenger,
      ctx.stateCommitmentChain
    );
  })

  .step("Receipt with a status of 1 for a successful message", async (ctx) => {
    const { remoteReceipt } = await waitForXDomainTransaction(
      ctx.watcher,
      withdrawTokensTxResponse,
      Direction.L2ToL1
    );
    assert.equal(remoteReceipt.status, 1);
  })
  .run();

async function ctxFactory() {
  const networkName = env.network("TESTING_MTS_NETWORK", "goerli");
  const { AddressManager, L1CrossDomainMessenger, L2CrossDomainMessenger } =
    metis.addresses(networkName);
  const testingSetup = await metis.testing(networkName).getE2ETestSetup();

  // todo: We need it to keep it in the utils metis addresses.
  const stateCommitmentChainAddress =
    await testingSetup.addressManager.getAddress("StateCommitmentChain");

  // todo: add the contract to contracts/metis and refactor creating the contract like xDomainMessengers.
  const stateCommitmentChain = getContractFactory("StateCommitmentChain")
    .connect(testingSetup.l1Tester)
    .attach(stateCommitmentChainAddress);

  const chainIdTo = network.chainId("mts", networkName);

  const { LibAddressManagerMetis } = metis.contracts(networkName, {
    forking: false,
  });

  const watcher = await initWatcher(
    testingSetup.l1Provider,
    testingSetup.l2Provider,
    LibAddressManagerMetis
  );

  return {
    chainIdTo,
    watcher,
    depositAmount: wei`0.0025 ether`,
    withdrawalAmount: wei`0.0025 ether`,
    l1Tester: testingSetup.l1Tester,
    l2Tester: testingSetup.l2Tester,
    l1Token: testingSetup.l1Token,
    l2Token: testingSetup.l2Token,
    l1ERC20TokenBridge: testingSetup.l1ERC20TokenBridge,
    l2ERC20TokenBridge: testingSetup.l2ERC20TokenBridge,
    l1CrossDomainMessenger: testingSetup.l1CrossDomainMessenger,
    l2CrossDomainMessenger: testingSetup.l2CrossDomainMessenger,
    stateCommitmentChain,
    l1Provider: testingSetup.l1Provider,
    l2Provider: testingSetup.l2Provider,
    crossChainMessenger: new CrossChainMessenger({
      l2ChainId: network.chainId("mts", networkName),
      l1ChainId: network.chainId("eth", networkName),
      l1SignerOrProvider: testingSetup.l1Tester,
      l2SignerOrProvider: testingSetup.l2Tester,
      contracts: {
        l1: {
          AddressManager,
          L1CrossDomainMessenger,
          L1StandardBridge: "0xCF7257A86A5dBba34bAbcd2680f209eb9a05b2d2",
          StateCommitmentChain: "0xd7344Cd0cC2C1A4c208B87fF227aDd1A576ac397",
          CanonicalTransactionChain:
            "0x6Aec60fc997B4e2931b892398517b56F7b3C48Dd",
          BondManager: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9",
          OptimismPortal: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
          L2OutputOracle: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
        },
        l2: {
          L2CrossDomainMessenger,
          L2StandardBridge: "0x4200000000000000000000000000000000000010",
          L2ToL1MessagePasser: "0x4200000000000000000000000000000000000000",
          OVM_L1BlockNumber: "0x4200000000000000000000000000000000000013",
          OVM_L2ToL1MessagePasser: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9",
          OVM_DeployerWhitelist: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
          OVM_ETH: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
          OVM_GasPriceOracle: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
          OVM_SequencerFeeVault: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
          WETH: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
          BedrockMessagePasser: "0x68c39fc25cd754009C87B3160D5Fc9c155A6dFb9", // todo
        },
      },
      bridges: {
        LidoBridge: {
          Adapter: DAIBridgeAdapter,
          l1Bridge: testingSetup.l1ERC20TokenBridge.address,
          l2Bridge: testingSetup.l2ERC20TokenBridge.address,
        },
      },
    }),
  };
}
