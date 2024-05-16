import env from "../../utils/env";
import network from "../../utils/network";
import {
  ERC20BridgedPermit__factory,
  L1ERC20TokenBridgeMetis__factory,
  OssifiableProxy__factory,
} from "../../typechain";

/**
 * Initialize the implementations of l1 and l2 bridge contracts and l2 wsteth contract
 */
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
  const l2TokenAddress = env.address("L2_TOKEN");
  const l2TokenProxyContract = OssifiableProxy__factory.connect(
    l2TokenAddress,
    l2Signer
  );
  const l2Token = ERC20BridgedPermit__factory.connect(l2TokenAddress, l2Signer);
  const [tokenName, tokenSymbol] = await Promise.all([
    l2Token.name(),
    l2Token.symbol(),
  ]);
  const l2TokenImplementationAddress =
    await l2TokenProxyContract.proxy__getImplementation();
  const l2TokenImplementationContract = ERC20BridgedPermit__factory.connect(
    l2TokenImplementationAddress,
    l2Signer
  );
  try {
    const tx = await l2TokenImplementationContract.initialize(
      tokenName,
      tokenSymbol
    );
    await tx.wait();
    console.log(
      "L2 wsteth (Metis) implementation contract was successfully initialized!"
    );
  } catch (error) {
    // console.error(error);
    console.log(
      "L2 wsteth (Metis) implementation contract already initialized"
    );
  }

  const l1TokenBridgeAddress = env.address("L1_ERC20_TOKEN_BRIDGE");
  const l1TokenBridgeProxy = OssifiableProxy__factory.connect(
    l1TokenBridgeAddress,
    l1Signer
  );
  const l1ProxyAdmin = await l1TokenBridgeProxy.proxy__getAdmin();
  const l1TokenBridgeImplementationAddress =
    await l1TokenBridgeProxy.proxy__getImplementation();
  const l1TokenBridgeImplementationContract =
    L1ERC20TokenBridgeMetis__factory.connect(
      l1TokenBridgeImplementationAddress,
      l1Signer
    );
  try {
    const tx = await l1TokenBridgeImplementationContract.initialize(
      l1ProxyAdmin
    );
    await tx.wait();
    console.log(
      "L1 token bridge (Metis) implementation contract was successfully initialized!"
    );
  } catch (error) {
    // console.error(error);
    console.log(
      "L1 token bridge (Metis) implementation contract already initialized"
    );
  }

  const l2TokenBridgeAddress = env.address("L2_ERC20_TOKEN_BRIDGE");
  const l2TokenBridgeProxy = OssifiableProxy__factory.connect(
    l2TokenBridgeAddress,
    l2Signer
  );
  const l2ProxyAdmin = await l2TokenBridgeProxy.proxy__getAdmin();
  const l2TokenBridgeImplementationAddress =
    await l2TokenBridgeProxy.proxy__getImplementation();
  const l2TokenBridgeImplementationContract =
    L1ERC20TokenBridgeMetis__factory.connect(
      l2TokenBridgeImplementationAddress,
      l2Signer
    );
  try {
    const tx = await l2TokenBridgeImplementationContract.initialize(
      l2ProxyAdmin
    );
    await tx.wait();
    console.log(
      "L2 token bridge (Metis) implementation contract was successfully initialized!"
    );
  } catch (error) {
    // console.error(error);
    console.log(
      "L2 token bridge (Metis) implementation contract already initialized"
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
