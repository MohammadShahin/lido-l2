import env from "../../utils/env";
import network from "../../utils/network";
import { ERC20L1Stub__factory } from "../../typechain";

async function main() {
  const networkName = env.network();
  const ethMtsNetwork = network.multichain(["eth", "mts"], networkName);

  const [ethDeployer] = ethMtsNetwork.getSigners(env.privateKey(), {
    forking: env.forking(),
  });

  const token = await new ERC20L1Stub__factory(ethDeployer).deploy();

  await token.deployed();

  console.log(`ERC20L1Stub deployed to: ${token.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
