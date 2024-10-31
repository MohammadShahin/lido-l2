import { assert } from "chai";
import { TransactionResponse } from "@ethersproject/providers";

import {
  L2ERC20TokenBridgeMetis__factory,
  GovBridgeExecutor__factory,
  AragonAgentMock__factory,
} from "../../typechain";
import {
  E2E_TEST_CONTRACTS_METIS as E2E_TEST_CONTRACTS,
  sleep,
} from "../../utils/testing/e2e";
import env from "../../utils/env";
import network from "../../utils/network";
import { scenario } from "../../utils/testing";
import metis from "../../utils/metis";

const DEPOSIT_ENABLER_ROLE =
  "0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a";
const DEPOSIT_DISABLER_ROLE =
  "0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6";

let l2DepositsInitialState = true;

let messageTx: TransactionResponse;

const scenarioTest = scenario(
  "Metis :: AAVE governance crosschain bridge: token bridge management",
  ctxFactory
)
  .step("Checking deposits status", async ({ l2ERC20TokenBridge }) => {
    l2DepositsInitialState = await l2ERC20TokenBridge.isDepositsEnabled();
  })

  .step(
    `Execute (from LidoMock) to enable/disable deposits on queue as task on L2`,
    async (ctx) => {
      const grantRoleCalldata =
        ctx.l2ERC20TokenBridge.interface.encodeFunctionData("grantRole", [
          l2DepositsInitialState ? DEPOSIT_DISABLER_ROLE : DEPOSIT_ENABLER_ROLE,
          ctx.govBridgeExecutor.address,
        ]);
      const grantRoleData = "0x" + grantRoleCalldata.substring(10);

      const actionCalldata = l2DepositsInitialState
        ? ctx.l2ERC20TokenBridge.interface.encodeFunctionData("disableDeposits")
        : ctx.l2ERC20TokenBridge.interface.encodeFunctionData("enableDeposits");

      const actionData = "0x" + actionCalldata.substring(10);
      const executorCalldata =
        ctx.govBridgeExecutor.interface.encodeFunctionData("queue", [
          [ctx.l2ERC20TokenBridge.address, ctx.l2ERC20TokenBridge.address],
          [0, 0],
          [
            "grantRole(bytes32,address)",
            l2DepositsInitialState ? "disableDeposits()" : "enableDeposits()",
          ],
          [grantRoleData, actionData],
          [false, false],
        ]);
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

      messageTx = await ctx.lidoAragonDAOMock.execute(
        ctx.mtsAddresses.L1CrossDomainMessenger,
        callvalue,
        calldata
      );

      await messageTx.wait();
    }
  )

  .step("Waiting for status to change to RELAYED", async ({ messaging }) => {
    await messaging.waitForL2Message(messageTx.hash);
  })

  .step("Execute queued task", async ({ govBridgeExecutor, l2Tester }) => {
    const tasksCount = await govBridgeExecutor.getActionsSetCount();

    const targetTask = tasksCount.toNumber() - 1;

    const executionTime = (
      await govBridgeExecutor.getActionsSetById(targetTask)
    ).executionTime.toNumber();
    let chainTime;

    do {
      await sleep(5000);
      const currentBlockNumber = await l2Tester.provider.getBlockNumber();
      const currentBlock = await l2Tester.provider.getBlock(currentBlockNumber);
      chainTime = currentBlock.timestamp;
    } while (chainTime <= executionTime);

    const tx = await govBridgeExecutor.execute(targetTask);
    await tx.wait();
  })

  .step("Checking deposits state", async ({ l2ERC20TokenBridge }) => {
    assert.equal(
      await l2ERC20TokenBridge.isDepositsEnabled(),
      !l2DepositsInitialState
    );
  });

// make first run to change state from enabled/disabled -> disabled/enabled
scenarioTest.run();

// make another run to return the state to the initial and test vice versa actions
scenarioTest.run();

async function ctxFactory() {
  const networkName = "sepolia";
  const ethMtsNetwork = network.multichain(["eth", "mts"], networkName);
  const mtsContracts = metis.contracts(networkName, { forking: false });
  const chainId = network.chainId("mts", networkName);
  const mtsAddresses = metis.addresses(networkName);
  const { LibAddressManagerMetis } = metis.contracts(networkName, {
    forking: false,
  });
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
  const addressManager = LibAddressManagerMetis.connect(l1Tester);

  const l1StandardBridgeAddress = await addressManager.getAddress(
    "Proxy__OVM_L1StandardBridge"
  );

  return {
    chainId,
    lidoAragonDAOMock,
    mtsAddresses,
    mtsContracts,
    l1StandardBridgeAddress,
    messaging: metis.messaging(networkName, { forking: false }),
    l1Tester,
    l2Tester,
    l2ERC20TokenBridge: L2ERC20TokenBridgeMetis__factory.connect(
      E2E_TEST_CONTRACTS.l2.l2ERC20TokenBridge,
      l2Tester
    ),
    govBridgeExecutor: GovBridgeExecutor__factory.connect(
      E2E_TEST_CONTRACTS.l2.govBridgeExecutor,
      l2Tester
    ),
  };
}
