/**
 * BNB Smart Chain parameters published by BNB Chain:
 * - https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/
 * - https://docs.bnbchain.org/bnb-smart-chain/developers/wallet-configuration/
 *
 * Mainnet chain id 56 (0x38). Testnet chain id 97 (0x61).
 * Public RPC hostnames below come from those pages. A deployment still requires
 * the matching environment variable so a fallback is never silent.
 */

export type NetworkKind = "local" | "testnet" | "mainnet";

export type NetworkDefinition = {
  name: "hardhat" | "localhost" | "bscTestnet" | "bsc";
  kind: NetworkKind;
  chainId: number;
  explorer: string | undefined;
  rpcEnv: "BSC_TESTNET_RPC_URL" | "BSC_MAINNET_RPC_URL" | undefined;
  officialRpc: string | undefined;
};

const HARDHAT: NetworkDefinition = {
  name: "hardhat",
  kind: "local",
  chainId: 31337,
  explorer: undefined,
  rpcEnv: undefined,
  officialRpc: undefined,
};

const LOCALHOST: NetworkDefinition = {
  name: "localhost",
  kind: "local",
  chainId: 31337,
  explorer: undefined,
  rpcEnv: undefined,
  officialRpc: "http://127.0.0.1:8545",
};

const BSC_TESTNET: NetworkDefinition = {
  name: "bscTestnet",
  kind: "testnet",
  chainId: 97,
  explorer: "https://testnet.bscscan.com",
  rpcEnv: "BSC_TESTNET_RPC_URL",
  officialRpc: "https://bsc-testnet-dataseed.bnbchain.org",
};

const BSC_MAINNET: NetworkDefinition = {
  name: "bsc",
  kind: "mainnet",
  chainId: 56,
  explorer: "https://bscscan.com",
  rpcEnv: "BSC_MAINNET_RPC_URL",
  officialRpc: "https://bsc-dataseed.bnbchain.org",
};

export function getNetworkDefinition(name: string): NetworkDefinition {
  switch (name) {
    case "hardhat":
      return HARDHAT;
    case "localhost":
      return LOCALHOST;
    case "bscTestnet":
      return BSC_TESTNET;
    case "bsc":
      return BSC_MAINNET;
    default:
      throw new Error(
        `Unsupported network "${name}". Expected hardhat, localhost, bscTestnet, or bsc.`,
      );
  }
}

export function explorerAddressUrl(definition: NetworkDefinition, address: string): string | undefined {
  if (definition.explorer === undefined) {
    return undefined;
  }
  return `${definition.explorer}/address/${address}`;
}

export function officialRpcUrl(definition: NetworkDefinition): string | undefined {
  return definition.officialRpc;
}
