import env from "../../utils/env";
import network from "../../utils/network";
import metis from "../../utils/metis";
import {
  Direction,
  initWatcher,
  waitForXDomainTransaction,
} from "../../utils/metis/watcher";
import {
  ERC20BridgedPermit__factory,
  ERC20__factory,
  L1ERC20TokenBridgeMetis__factory,
} from "../../typechain";
import { wei } from "../../utils/wei";

async function main() {
  const networkName = env.network();
  const chainIdTo = network.chainId("mts", networkName);
  const [l1Signer, l2Signer] = network
    .multichain(["eth", "mts"], networkName)
    .getSigners(env.privateKey(), { forking: false });
  const [l1Provider, l2Provider] = network
    .multichain(["eth", "mts"], networkName)
    .getProviders({ forking: false });
  await l1Provider.ready;
  await l2Provider.ready;
  const l1WstEthAddress = env.address("L1_TOKEN");
  const l2WstEthAddress = env.address("L2_TOKEN");
  const depositAmount = wei`0.001 ether`;
  const mtsContracts = metis.contracts(networkName, { forking: false });
  const l1WstEthContract = ERC20__factory.connect(l1WstEthAddress, l1Signer);
  const l2WstEthContract = ERC20BridgedPermit__factory.connect(
    l2WstEthAddress,
    l2Signer
  );
  const l1TokenBridge = L1ERC20TokenBridgeMetis__factory.connect(
    env.address("L1_ERC20_TOKEN_BRIDGE"),
    l1Signer
  );
  console.log(`Approving ${depositAmount} WSTETH...`);
  const setAllowanceTx = await l1WstEthContract.approve(
    l1TokenBridge.address,
    depositAmount
  );
  await setAllowanceTx.wait();
  console.log(
    `Allowance set for ${depositAmount} WSTETH in transaction ${setAllowanceTx.hash}`
  );
  console.log(`Depositing (L1 -> L2) ${depositAmount} WSTETH...`);
  const l2Gas = 5000000;
  const depositTokensTxResponse = await l1TokenBridge.depositERC20ByChainId(
    chainIdTo,
    l1WstEthContract.address,
    l2WstEthContract.address,
    depositAmount,
    l2Gas,
    "0x",
    {
      value: wei`0.0025 ether`,
    }
  );

  await depositTokensTxResponse.wait();
  console.log(
    `Deposited ${depositAmount} WSTETH in transaction ${depositTokensTxResponse.hash}`
  );

  const watcher = await initWatcher(
    l1Provider,
    l2Provider,
    mtsContracts.LibAddressManagerMetis
  );

  const { remoteReceipt } = await waitForXDomainTransaction(
    watcher,
    depositTokensTxResponse,
    Direction.L1ToL2
  );

  console.log("Relayed L1 -> L2. Tx hash:", remoteReceipt.transactionHash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
