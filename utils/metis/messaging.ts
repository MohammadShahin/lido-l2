import contracts from "./contracts";
import network, { NetworkName } from "../network";
import { CommonOptions } from "./types";
import { Direction, initWatcher, waitForXDomainTransaction } from "./watcher";
import { wei } from "../wei";

interface ContractsOptions extends CommonOptions {
  forking: boolean;
}

interface MessageData {
  sender: string;
  recipient: string;
  calldata: string;
  gasLimit?: number;
}

export default function messaging(
  networkName: NetworkName,
  options: ContractsOptions
) {
  const [ethProvider, mtsProvider] = network
    .multichain(["eth", "mts"], networkName)
    .getProviders(options);
  const chainId = network.chainId("mts", networkName);

  const mtsContracts = contracts(networkName, options);
  return {
    prepareL2Message(msg: MessageData) {
      const calldata =
        mtsContracts.L1CrossDomainMessenger.interface.encodeFunctionData(
          "sendMessageViaChainId",
          [chainId, msg.recipient, msg.calldata, msg.gasLimit || 1_000_000]
        );

      return { calldata, callvalue: wei`0.01 ether` };
    },
    async waitForL2Message(txHash: string) {
      const watcher = await initWatcher(
        ethProvider,
        mtsProvider,
        mtsContracts.LibAddressManagerMetis
      );
      const tx = await ethProvider.getTransaction(txHash);
      return await waitForXDomainTransaction(watcher, tx, Direction.L1ToL2);
    },
  };
}
