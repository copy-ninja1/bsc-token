import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

import { EVM_VERSION, OPTIMIZER_ENABLED, OPTIMIZER_RUNS, SOLIDITY_VERSION, VIA_IR } from "./config/compiler";
import { getNetworkDefinition, officialRpcUrl } from "./config/networks";

dotenv.config();

function deploymentAccounts(): string[] {
  const value = process.env.PRIVATE_KEY;
  if (value === undefined || value.trim().length === 0) {
    return [];
  }
  const normalized = value.trim().startsWith("0x") ? value.trim().slice(2) : value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("PRIVATE_KEY must be a 32-byte hex string.");
  }
  return [`0x${normalized}`];
}

function publicRpc(networkName: "bscTestnet" | "bsc"): string {
  const definition = getNetworkDefinition(networkName);
  const configured = definition.rpcEnv === undefined ? undefined : process.env[definition.rpcEnv];
  if (configured !== undefined && configured.trim().length > 0) {
    return configured.trim();
  }
  const official = officialRpcUrl(definition);
  if (official === undefined) {
    throw new Error(`No RPC URL is configured for ${networkName}.`);
  }
  return official;
}

const accounts = deploymentAccounts();
const bscTestnetRpc = publicRpc("bscTestnet");
const bscMainnetRpc = publicRpc("bsc");
const bscScanKey = process.env.BSCSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: SOLIDITY_VERSION,
    settings: {
      optimizer: {
        enabled: OPTIMIZER_ENABLED,
        runs: OPTIMIZER_RUNS,
      },
      evmVersion: EVM_VERSION,
      viaIR: VIA_IR,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    bscTestnet: {
      url: bscTestnetRpc,
      chainId: 97,
      accounts,
      // BSC testnet rejects tips under 0.1 gwei. 1 gwei clears that floor.
      gasPrice: 1_000_000_000,
    },
    bsc: {
      url: bscMainnetRpc,
      chainId: 56,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      bsc: bscScanKey,
      bscTestnet: bscScanKey,
    },
    customChains: [
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=56",
          browserURL: "https://bscscan.com",
        },
      },
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=97",
          browserURL: "https://testnet.bscscan.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  mocha: {
    timeout: 180000,
  },
};

export default config;
