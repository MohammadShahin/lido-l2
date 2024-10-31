import env from "../../utils/env";
import network from "../../utils/network";
import { AragonAgentMock__factory } from "../../typechain";

async function main() {
  const networkName = env.network();
  const ethMtsNetwork = network.multichain(["eth", "mts"], networkName);

  const [ethDeployer] = ethMtsNetwork.getSigners(env.privateKey(), {
    forking: env.forking(),
  });

  const aragon = await new AragonAgentMock__factory(ethDeployer).deploy();

  await aragon.deployed();

  console.log(`AragonAgentMock deployed to: ${aragon.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
