import env from "../../utils/env";
import network from "../../utils/network";
import metis from "../../utils/metis";
import { getContractFactory } from "@metis.io/contracts";
import {
  Direction,
  getMessagesAndProofs,
  initWatcher,
  relayXDomainMessages,
  waitForOutsideFraudProofWindow,
  waitForXDomainTransaction,
} from "../../utils/metis/watcher";

async function main() {
  const networkName = env.network();
  const [l1Signer, l2Signer] = network
    .multichain(["eth", "mts"], networkName)
    .getSigners(env.privateKey(), { forking: false });
  const [l1Provider, l2Provider] = network
    .multichain(["eth", "mts"], networkName)
    .getProviders({ forking: false });
  await l1Provider.ready;
  await l2Provider.ready;
  const chainIdTo = network.chainId("mts", networkName);
  const mtsContracts = metis.contracts(networkName, { forking: false });
  const txHash = env.string("TX_HASH");
  const withdrawTokensTxResponse = await l2Provider.getTransaction(txHash);
  const watcher = await initWatcher(
    l1Provider,
    l2Provider,
    mtsContracts.LibAddressManagerMetis
  );

  const stateCommitmentChainAddress =
    await mtsContracts.LibAddressManagerMetis.getAddress(
      "StateCommitmentChain"
    );

  const stateCommitmentChain = getContractFactory("StateCommitmentChain")
    .connect(l1Signer)
    .attach(stateCommitmentChainAddress);

  console.log("Finalizing the L2 -> L1 message for transaction...");

  console.log("1. Getting the message(s) and proof(s)...");
  const messagesAndProofs = await getMessagesAndProofs(
    withdrawTokensTxResponse,
    l1Provider,
    l2Provider,
    mtsContracts.L2CrossDomainMessenger,
    stateCommitmentChain,
    chainIdTo,
    l2Signer
  );

  console.log("2. Waiting for the message to be outside the fraud period...");
  await waitForOutsideFraudProofWindow(messagesAndProofs, stateCommitmentChain);

  console.log("3. Relaying the L2 -> L1 message...");
  await relayXDomainMessages(
    messagesAndProofs,
    mtsContracts.L1CrossDomainMessenger.connect(l1Signer),
    chainIdTo
  );

  console.log(
    "4. Waiting for the receipt with a status of 1 for a successful message..."
  );
  const { remoteReceipt } = await waitForXDomainTransaction(
    watcher,
    withdrawTokensTxResponse,
    Direction.L2ToL1
  );

  if (remoteReceipt.status !== 1) {
    throw new Error(`Invalid receipt status: ${remoteReceipt.status}`);
  }

  console.log("5. Done!");
  console.log(
    `L2 -> L1 message finalized successfully for tx ${txHash} on L1 and ${remoteReceipt.transactionHash} on L2`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
