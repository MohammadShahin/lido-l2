import {
  JsonRpcProvider,
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/providers";
import { Watcher, sleep } from "./core-utils";
import {
  CrossDomainMessagePair,
  getMessagesAndProofsForL2Transaction,
} from "./message-relayer";

import { Contract, Transaction, Wallet, providers } from "ethers";
import {
  L1CrossDomainMessengerMetis,
  L2CrossDomainMessengerMetis,
} from "../../typechain";

export const initWatcher = async (
  l1Provider: JsonRpcProvider,
  l2Provider: JsonRpcProvider,
  AddressManager: Contract
) => {
  const l1MessengerAddress = await AddressManager.getAddress(
    "Proxy__OVM_L1CrossDomainMessenger"
  );
  const l2MessengerAddress = await AddressManager.getAddress(
    "L2CrossDomainMessenger"
  );
  return new Watcher({
    l1: {
      provider: l1Provider,
      messengerAddress: l1MessengerAddress,
    },
    l2: {
      provider: l2Provider,
      messengerAddress: l2MessengerAddress,
    },
    blocksToFetch: 15000,
  });
};

export interface CrossDomainMessagePairTx {
  tx: Transaction;
  receipt: TransactionReceipt;
  remoteTx: Transaction;
  remoteReceipt: TransactionReceipt;
}

export enum Direction {
  // eslint-disable-next-line no-unused-vars
  L1ToL2,
  // eslint-disable-next-line no-unused-vars
  L2ToL1,
}

export const waitForXDomainTransaction = async (
  watcher: Watcher,
  tx: Promise<TransactionResponse> | TransactionResponse,
  direction: Direction
): Promise<CrossDomainMessagePairTx> => {
  const { src, dest } =
    direction === Direction.L1ToL2
      ? { src: watcher.l1, dest: watcher.l2 }
      : { src: watcher.l2, dest: watcher.l1 };

  // await it if needed
  tx = await tx;
  // get the receipt and the full transaction
  const receipt = (await tx.wait())!;
  const fullTx = (await src.provider.getTransaction(tx.hash))!;

  // get the message hash which was created on the SentMessage
  const [xDomainMsgHash] = await watcher.getMessageHashesFromTx(src, tx.hash);
  // Get the transaction and receipt on the remote layer
  const remoteReceipt = (await watcher.getTransactionReceipt(
    dest,
    xDomainMsgHash
  ))!;
  const remoteTx = (await dest.provider.getTransaction(
    remoteReceipt.transactionHash
  ))!;

  return {
    tx: fullTx,
    receipt,
    remoteTx,
    remoteReceipt,
  };
};

export const getMessagesAndProofs = async (
  tx: Promise<TransactionResponse> | TransactionResponse,
  l1Provider: providers.JsonRpcProvider,
  l2Provider: providers.JsonRpcProvider,
  l2CrossDomainMessenger: L2CrossDomainMessengerMetis,
  stateCommitmentChain: Contract, // todo: replace Contract with StateCommitmentChain
  chainId: number,
  l2Signer: Wallet
) => {
  tx = await tx;

  let messagePairs: Awaited<
    ReturnType<typeof getMessagesAndProofsForL2Transaction>
  >;
  while (true) {
    try {
      messagePairs = await getMessagesAndProofsForL2Transaction(
        l1Provider,
        l2Provider,
        stateCommitmentChain.address,
        l2CrossDomainMessenger.address,
        tx.hash,
        chainId
      );
      break;
    } catch (err: any) {
      if (err.message.includes("unable to find state root batch for tx")) {
        console.log(`no state root batch for tx yet, trying again in 50s...`);
        await sleep(50000);
      } else {
        throw err;
      }
    }
  }

  return messagePairs;
};

export const waitForOutsideFraudProofWindow = async (
  messagePairs: CrossDomainMessagePair[],
  stateCommitmentChain: Contract // todo: replace Contract with StateCommitmentChain
) => {
  for (const { proof } of messagePairs) {
    while (true) {
      try {
        const isInside = await stateCommitmentChain.insideFraudProofWindow(
          proof.stateRootBatchHeader
        );
        if (!isInside) {
          break;
        }
        throw new Error("Proof is inside fraud proof window");
      } catch (err: any) {
        if (err.message.includes("Proof is inside fraud proof window")) {
          await sleep(5000);
        } else {
          throw err;
        }
      }
    }
  }
};

export const relayXDomainMessages = async (
  messagePairs: CrossDomainMessagePair[],
  l1CrossDomainMessenger: L1CrossDomainMessengerMetis,
  chainId: number
) => {
  for (const { message, proof } of messagePairs) {
    while (true) {
      try {
        const result = await l1CrossDomainMessenger.relayMessageViaChainId(
          chainId,
          message.target,
          message.sender,
          message.message,
          message.messageNonce,
          proof
        );
        await result.wait();
        break;
      } catch (err: any) {
        if (err.message.includes("execution failed due to an exception")) {
          await sleep(5000);
        } else if (err.message.includes("Nonce too low")) {
          await sleep(5000);
        } else if (err.message.includes("message has already been received")) {
          console.log("message has already been received");
          break;
        } else {
          throw err;
        }
      }
    }
  }
};

/**
 * Relays all L2 => L1 messages found in a given L2 transaction.
 *
 * @param tx Transaction to find messages in.
 */
export const relayXDomainMessagesWhole = async (
  tx: Promise<TransactionResponse> | TransactionResponse,
  l1Provider: providers.JsonRpcProvider,
  l2Provider: providers.JsonRpcProvider,
  l1CrossDomainMessenger: L1CrossDomainMessengerMetis,
  l2CrossDomainMessenger: L2CrossDomainMessengerMetis,
  stateCommitmentChain: Contract, // todo: replace Contract with StateCommitmentChain
  chainId: number,
  l2Signer: Wallet
): Promise<void> => {
  tx = await tx;

  let messagePairs = [];
  while (true) {
    try {
      messagePairs = await getMessagesAndProofsForL2Transaction(
        l1Provider,
        l2Provider,
        stateCommitmentChain.address,
        l2CrossDomainMessenger.address,
        tx.hash,
        chainId
      );
      break;
    } catch (err: any) {
      if (err.message.includes("unable to find state root batch for tx")) {
        console.log(`no state root batch for tx yet, trying again in 50s...`);
        await sleep(50000);
      } else {
        throw err;
      }
    }
  }

  for (const { message, proof } of messagePairs) {
    while (true) {
      try {
        const result = await l1CrossDomainMessenger.relayMessageViaChainId(
          chainId,
          message.target,
          message.sender,
          message.message,
          message.messageNonce,
          proof
        );
        await result.wait();
        break;
      } catch (err: any) {
        if (err.message.includes("execution failed due to an exception")) {
          await sleep(5000);
        } else if (err.message.includes("Nonce too low")) {
          await sleep(5000);
        } else if (err.message.includes("message has already been received")) {
          break;
        } else {
          throw err;
        }
      }
    }
  }
};

export { CrossDomainMessagePair } from "./message-relayer";
