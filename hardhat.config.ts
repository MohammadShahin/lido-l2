import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";

import "./tasks/fork-node";
import env from "./utils/env";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.6.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100_000,
          },
          evmVersion: "berlin",
        },
      },
    ],
  },
  networks: {
    // Ethereum Public Chains
    eth_mainnet: {
      url: env.string("RPC_ETH_MAINNET", ""),
    },
    eth_goerli: {
      url: env.string("RPC_ETH_GOERLI", ""),
    },
    eth_holesky: {
      url: env.string("RPC_ETH_HOLESKY", ""),
    },
    eth_sepolia: {
      url: env.string("RPC_ETH_SEPOLIA", ""),
    },

    // Ethereum Fork Chains
    eth_mainnet_fork: {
      url: "http://localhost:8545",
    },
    eth_goerli_fork: {
      url: "http://localhost:8545",
    },
    eth_holesky_fork: {
      url: "http://localhost:8545",
    },
    eth_sepolia_fork: {
      url: "http://localhost:8545",
    },

    // Arbitrum Public Chains
    arb_mainnet: {
      url: env.string("RPC_ARB_MAINNET", ""),
    },
    arb_goerli: {
      url: env.string("RPC_ARB_GOERLI", ""),
    },

    // Arbitrum Fork Chains
    arb_mainnet_fork: {
      url: "http://localhost:8546",
    },
    arb_goerli_fork: {
      url: "http://localhost:8546",
    },

    // Optimism Public Chains
    opt_mainnet: {
      url: env.string("RPC_OPT_MAINNET", ""),
    },
    opt_goerli: {
      url: env.string("RPC_OPT_GOERLI", ""),
    },

    // Optimism Fork Chains
    opt_mainnet_fork: {
      url: "http://localhost:9545",
    },
    opt_goerli_fork: {
      url: "http://localhost:9545",
    },

    // Metis Public Chains
    mts_mainnet: {
      url: env.string("RPC_MTS_MAINNET", ""),
    },
    mts_holesky: {
      url: env.string("RPC_MTS_HOLESKY", ""),
    },
    mts_goerli: {
      url: env.string("RPC_MTS_GOERLI", ""),
    },
    mts_sepolia: {
      url: env.string("RPC_MTS_SEPOLIA", ""),
    },

    // Metis Fork Chains
    mts_mainnet_fork: {
      url: "http://localhost:4000",
    },
    mts_holesky_fork: {
      url: "http://localhost:4000",
    },
    mts_goerli_fork: {
      url: "http://localhost:4000",
    },
    mts_sepolia_fork: {
      url: "http://localhost:4000",
    },
  },
  gasReporter: {
    enabled: env.string("REPORT_GAS", "false") !== "false",
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: env.string("ETHERSCAN_API_KEY_ETH", ""),
      goerli: env.string("ETHERSCAN_API_KEY_ETH", ""),
      arbitrumGoerli: env.string("ETHERSCAN_API_KEY_ARB", ""),
      arbitrumOne: env.string("ETHERSCAN_API_KEY_ARB", ""),
      optimisticEthereum: env.string("ETHERSCAN_API_KEY_OPT", ""),
      optimisticGoerli: env.string("ETHERSCAN_API_KEY_OPT", ""),
      metisMainnet: env.string("ETHERSCAN_API_KEY_MTS", ""),
      metisHolesky: env.string("ETHERSCAN_API_KEY_MTS", ""),
      metisGoerli: env.string("ETHERSCAN_API_KEY_MTS", ""),
      metisSepolia: env.string("ETHERSCAN_API_KEY_MTS", ""),
    },
  },
  typechain: {
    externalArtifacts: [
      "./interfaces/**/*.json",
      "./utils/optimism/artifacts/*.json",
      "./utils/arbitrum/artifacts/*.json",
      "./utils/metis/artifacts/*.json",
    ],
  },
  mocha: {
    timeout: 70 * 60 * 60 * 1000, // 70 minutes for e2e tests
  },
};

export default config;
