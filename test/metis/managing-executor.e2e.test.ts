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

let messageTx: TransactionResponse;
let oldGuardian: string;
let newGuardian: string;

scenario("Metis :: AAVE governance crosschain bridge management", ctxFactory)
  .step(`Update L2 executor guardian from L1`, async (ctx) => {
    oldGuardian = await ctx.govBridgeExecutor.getGuardian();
    newGuardian =
      oldGuardian === "0xa5F1d7D49F581136Cf6e58B32cBE9a2039C48bA1"
        ? "0x0000000000000000000000000000000000000000"
        : "0xa5F1d7D49F581136Cf6e58B32cBE9a2039C48bA1";

    const updateGuardianCalldata =
      ctx.govBridgeExecutor.interface.encodeFunctionData("updateGuardian", [
        newGuardian,
      ]);
    const updateGuardianData = "0x" + updateGuardianCalldata.substring(10);

    const executorCalldata = ctx.govBridgeExecutor.interface.encodeFunctionData(
      "queue",
      [
        [ctx.govBridgeExecutor.address],
        [0],
        ["updateGuardian(address)"],
        [updateGuardianData],
        [false],
      ]
    );

    const { calldata, callvalue } = await ctx.messaging.prepareL2Message({
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
  })

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

  .step("Checking guardian", async ({ govBridgeExecutor }) => {
    assert.equal(await govBridgeExecutor.getGuardian(), newGuardian);
  })

  .run();

async function ctxFactory() {
  const networkName = "sepolia";
  const ethMtsNetwork = network.multichain(["eth", "mts"], networkName);

  const { LibAddressManagerMetis } = metis.contracts(networkName, {
    forking: false,
  });
  const mtsAddresses = metis.addresses(networkName);
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

  return {
    lidoAragonDAOMock,
    addressManager,
    mtsAddresses,
    messaging: metis.messaging(networkName, { forking: false }),
    l1Tester,
    l2Tester,
    lidoAragonDAOMockAddress,
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
