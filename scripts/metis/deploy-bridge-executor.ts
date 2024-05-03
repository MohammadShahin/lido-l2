import env from "../../utils/env";
import network from "../../utils/network";
import metis from "../../utils/metis";
import { OptimismBridgeExecutor__factory } from "../../typechain";

async function main() {
  const networkName = env.network();
  const ethMtsNetwork = network.multichain(["eth", "mts"], networkName);

  const [, mtsDeployer] = ethMtsNetwork.getSigners(
    env.string("MTS_DEPLOYER_PRIVATE_KEY"),
    {
      forking: env.forking(),
    }
  );
  const { L2CrossDomainMessenger } = metis.addresses(networkName);
  const executorConfig = env.bridgeExecutorConfig();

  const l2AddressOfL1Executor = executorConfig.l1ExecutorAddress;

  const metisBridgeExecutor = await new OptimismBridgeExecutor__factory(
    mtsDeployer
  ).deploy(
    L2CrossDomainMessenger,
    l2AddressOfL1Executor,
    executorConfig.delay,
    executorConfig.gradePeriod,
    executorConfig.minDelay,
    executorConfig.maxDelay,
    executorConfig.guardian
  );
  await metisBridgeExecutor.deployed();

  console.log(
    `MetisBridgeExecutor deployed to: ${metisBridgeExecutor.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
