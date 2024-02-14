import hre from "hardhat";
import { providers, Signer, Wallet } from "ethers";
import { getContractAddress } from "ethers/lib/utils";
import { Provider } from "@ethersproject/providers";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";

import env from "./env";

type ChainNameShort = "arb" | "opt" | "eth" | "mts";
export type NetworkName = "goerli" | "mainnet" | "sepolia";
export type SignerOrProvider = Signer | Provider;

const HARDHAT_NETWORK_NAMES = {
  eth: {
    goerli: "eth_goerli",
    mainnet: "eth_mainnet",
    holesky: "eth_holesky",
    sepolia: "eth_sepolia",
  },
  arb: {
    goerli: "arb_goerli",
    mainnet: "arb_mainnet",
    holesky: "NOT_DEPLOYED",
    sepolia: "NOT_DEPLOYED",
  },
  opt: {
    goerli: "opt_goerli",
    mainnet: "opt_mainnet",
    holesky: "NOT_DEPLOYED",
    sepolia: "NOT_DEPLOYED",
  },
  mts: {
    goerli: "mts_goerli",
    mainnet: "mts_mainnet",
    holesky: "NOT_DEPLOYED",
    sepolia: "mts_sepolia",
  },
};

const HARDHAT_NETWORK_NAMES_FORK = {
  eth: {
    goerli: "eth_goerli_fork",
    mainnet: "eth_mainnet_fork",
    holesky: "eth_holesky_fork",
    sepolia: "eth_sepolia_fork",
  },
  arb: {
    goerli: "arb_goerli_fork",
    mainnet: "arb_mainnet_fork",
    holesky: "NOT_DEPLOYED",
    sepolia: "NOT_DEPLOYED",
  },
  opt: {
    goerli: "opt_goerli_fork",
    mainnet: "opt_mainnet_fork",
    holesky: "NOT_DEPLOYED",
    sepolia: "NOT_DEPLOYED",
  },
  mts: {
    goerli: "mts_goerli_fork",
    mainnet: "mts_mainnet_fork",
    holesky: "mts_holesky_fork",
    sepolia: "mts_sepolia_fork",
  },
};

export function getConfig(networkName: string, hre: HardhatRuntimeEnvironment) {
  const config = hre.config.networks[networkName];
  if (!config) {
    throw new Error(
      `Network with name ${networkName} not found. Check your hardhat.config.ts file contains network with given name`
    );
  }
  return config as HttpNetworkConfig;
}

export function getProvider(rpcURL: string) {
  return new providers.JsonRpcProvider(rpcURL);
}

export function getDeployer(rpcURL: string) {
  const PRIVATE_KEY = env.string("PRIVATE_KEY");
  return new Wallet(PRIVATE_KEY, getProvider(rpcURL));
}

// predicts future addresses of the contracts deployed by account
export async function predictAddresses(account: Wallet, txsCount: number) {
  const currentNonce = await account.getTransactionCount();

  const res: string[] = [];
  for (let i = 0; i < txsCount; ++i) {
    res.push(
      getContractAddress({
        from: account.address,
        nonce: currentNonce + i,
      })
    );
  }
  return res;
}

function loadAccount(rpcURL: string, accountPrivateKeyName: string) {
  const privateKey = env.string(accountPrivateKeyName);
  return new Wallet(privateKey, getProvider(rpcURL));
}

export function multichain(
  chainNames: ChainNameShort[],
  networkName: NetworkName
) {
  return {
    getNetworks(options: { forking: boolean }) {
      const hardhatNetworkNames = options.forking
        ? HARDHAT_NETWORK_NAMES_FORK
        : HARDHAT_NETWORK_NAMES;

      const res: HttpNetworkConfig[] = [];
      for (const chainName of chainNames) {
        const hardhatNetworkName = hardhatNetworkNames[chainName][networkName];
        if (hardhatNetworkName === "NOT_DEPLOYED") {
          throw new Error(
            `Chain "${chainName}" doesn't support "${hardhatNetworkName}" network`
          );
        }
        res.push(getConfig(hardhatNetworkName, hre));
      }
      return res;
    },
    getProviders(options: { forking: boolean }) {
      return this.getNetworks(options).map((network) =>
        getProvider(network.url)
      );
    },
    getSigners(privateKey: string, options: { forking: boolean }) {
      return this.getProviders(options).map(
        (provider) => new Wallet(privateKey, provider)
      );
    },
  };
}

function getChainId(protocol: ChainNameShort, networkName: NetworkName) {
  const chainIds = {
    eth: {
      mainnet: 1,
      goerli: 5,
      holesky: 17000,
      sepolia: 11155111,
    },
    opt: {
      mainnet: 10,
      goerli: 420,
      holesky: null,
      sepolia: null,
    },
    arb: {
      mainnet: 42161,
      goerli: 421613,
      holesky: null,
      sepolia: null,
    },
    mts: {
      mainnet: 1088,
      holesky: null,
      sepolia: 59901,
      goerli: 599,
    },
  };
  const chainId = chainIds[protocol][networkName];
  if (!chainId) {
    throw new Error(`Network for ${protocol} ${networkName} isn't declared`);
  }
  return chainId;
}

function getBlockExplorerBaseUrlByChainId(chainId: number) {
  const baseUrlByChainId: Record<number, string> = {
    // ethereum
    1: "https://etherscan.io",
    5: "https://goerli.etherscan.io",
    17000: "https://holesky.etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    // arbitrum
    42161: "https://arbiscan.io",
    421613: "https://goerli-rollup-explorer.arbitrum.io",
    // optimism
    10: "https://optimistic.etherscan.io",
    420: "https://blockscout.com/optimism/goerli",
    // metis
    1088: "https://andromeda-explorer.metis.io",
    599: "https://goerli.explorer.metisdevops.link",
    59901: "https://sepolia.explorer.metisdevops.link",
    // forked node
    31337: "https://etherscan.io",
  };
  return baseUrlByChainId[chainId];
}

export default {
  blockExplorerBaseUrl: getBlockExplorerBaseUrlByChainId,
  chainId: getChainId,
  multichain,
  getConfig,
  getProvider,
  loadAccount,
  getDeployer,
  predictAddresses,
};
