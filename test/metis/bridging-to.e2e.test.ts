import { assert } from "chai";
import { TransactionResponse } from "@ethersproject/providers";
import { getContractFactory } from "@metis.io/contracts";

import env from "../../utils/env";
import { wei } from "../../utils/wei";
import network from "../../utils/network";
import metis from "../../utils/metis";
import { ERC20L1Stub__factory } from "../../typechain";
import { scenario } from "../../utils/testing";

import {
  Direction,
  initWatcher,
  waitForXDomainTransaction,
  CrossDomainMessagePair,
  getMessagesAndProofs,
  waitForOutsideFraudProofWindow,
  relayXDomainMessages,
} from "../../utils/metis/watcher";

let depositTokensTxResponse: TransactionResponse;
let withdrawTokensTxResponse: TransactionResponse;
let messagesAndProofs: CrossDomainMessagePair[];

// This test follows the tests from the Metis repo

scenario("Metis :: Bridging via deposit/withdraw E2E test", ctxFactory)
  .step(
    "Mint to tester the required amount of L1 token",
    async ({ l1Token, l1Tester, depositAmount }) => {
      const balanceBefore = await l1Token.balanceOf(l1Tester.address);
      if (balanceBefore.lt(depositAmount)) {
        try {
          const tx = await l1Token.mint(
            depositAmount
          );
          await tx.wait();
        } catch (e) {
          console.log("Couldn't transfer tokens to tester, skipping test");
          throw e
        }
        const balanceAfter = await l1Token.balanceOf(l1Tester.address);
        assert.isTrue(
          balanceAfter.gte(depositAmount),
          "Tester has not enough L1 token"
        );
      }
    }
  )

  .step("Set allowance for L1ERC20TokenBridge to deposit", async (ctx) => {
    const allowanceTxResponse = await ctx.l1Token.approve(
      ctx.l1ERC20TokenBridge.address,
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
        await ctx.l1ERC20TokenBridge.depositERC20To(
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

  .step("Get the message(s) and proof(s)", async (ctx) => {
    messagesAndProofs = await getMessagesAndProofs(
      withdrawTokensTxResponse,
      ctx.l1Provider,
      ctx.l2Provider,
      ctx.l2CrossDomainMessenger,
      ctx.stateCommitmentChain,
      ctx.chainIdTo,
      ctx.l2Tester
    );
  })

  .step("Wait for the message to be outside the fraud period", async (ctx) => {
    await waitForOutsideFraudProofWindow(
      messagesAndProofs,
      ctx.stateCommitmentChain
    );
  })

  .step("Relay the L2 => L1 message", async (ctx) => {
    await relayXDomainMessages(
      messagesAndProofs,
      ctx.l1CrossDomainMessenger,
      ctx.chainIdTo
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
  const networkName = env.network("TESTING_MTS_NETWORK", "sepolia");
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

  const l1Token = ERC20L1Stub__factory.connect(testingSetup.l1Token.address, testingSetup.l1Tester);

  return {
    chainIdTo,
    watcher,
    depositAmount: wei`0.0025 ether`,
    withdrawalAmount: wei`0.0025 ether`,
    l1Tester: testingSetup.l1Tester,
    l2Tester: testingSetup.l2Tester,
    l1Token: l1Token,
    l2Token: testingSetup.l2Token,
    l1ERC20TokenBridge: testingSetup.l1ERC20TokenBridge,
    l2ERC20TokenBridge: testingSetup.l2ERC20TokenBridge,
    l1CrossDomainMessenger: testingSetup.l1CrossDomainMessenger,
    l2CrossDomainMessenger: testingSetup.l2CrossDomainMessenger,
    stateCommitmentChain,
    l1Provider: testingSetup.l1Provider,
    l2Provider: testingSetup.l2Provider,
  };
}
