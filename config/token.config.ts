import { ethers } from "ethers";

import { getNetworkDefinition, type NetworkKind } from "./networks";

export interface TokenDeploymentConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  metadataURI: string;
  v2PoolAddress: string;
  v3PoolAddress: string;
  initialOwner: string;
  initialSupplyRecipient: string;
}

export interface ResolvedTokenConfig extends TokenDeploymentConfig {
  rawInitialSupply: bigint;
  deployer: string;
  usingLocalDefaults: boolean;
  networkName: string;
  networkKind: NetworkKind;
}

export interface TokenEnv {
  TOKEN_NAME?: string;
  TOKEN_SYMBOL?: string;
  TOKEN_DECIMALS?: string;
  TOKEN_INITIAL_SUPPLY?: string;
  TOKEN_METADATA_URI?: string;
  INITIAL_OWNER?: string;
  INITIAL_SUPPLY_RECIPIENT?: string;
  UNISWAP_V2_POOL_ADDRESS?: string;
  UNISWAP_V3_POOL_ADDRESS?: string;
}

export interface LocalDefaults {
  v2PoolAddress: string;
  v3PoolAddress: string;
  metadataURI: string;
}

export const DEFAULT_TOKEN_NAME = "BTC Token";
export const DEFAULT_TOKEN_SYMBOL = "BTC";
export const TOKEN_DECIMALS = 18;
export const DEFAULT_INITIAL_SUPPLY = "1000000000";
export const DEFAULT_RAW_INITIAL_SUPPLY = ethers.parseUnits(DEFAULT_INITIAL_SUPPLY, TOKEN_DECIMALS);
export const LOCAL_METADATA_URI = "https://example.com/independent-btc-token.json";

const METADATA_URI_PATTERN = /^(https:\/\/|ipfs:\/\/)[^\s]+$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;
const ADDRESS_ENV_KEYS = [
  "INITIAL_OWNER",
  "INITIAL_SUPPLY_RECIPIENT",
  "UNISWAP_V2_POOL_ADDRESS",
  "UNISWAP_V3_POOL_ADDRESS",
  "TOKEN_METADATA_URI",
] as const;

function read(value: string | undefined): string {
  return value?.trim() ?? "";
}

function pushAddressError(errors: string[], label: string, value: string): string | undefined {
  if (value.length === 0) {
    errors.push(`${label} is required.`);
    return undefined;
  }
  try {
    const address = ethers.getAddress(value);
    if (address === ethers.ZeroAddress) {
      errors.push(`${label} is the zero address.`);
      return undefined;
    }
    return address;
  } catch {
    errors.push(`${label} is not a valid address.`);
    return undefined;
  }
}

/**
 * Validates deployment settings. Ownership and the initial supply recipient must
 * both be the wallet that submits `initialize`, because that is what the contract does.
 */
export function resolveTokenConfig(
  env: TokenEnv,
  networkName: string,
  deployer: string,
  localDefaults: LocalDefaults | undefined,
): ResolvedTokenConfig {
  const network = getNetworkDefinition(networkName);
  const errors: string[] = [];
  const deployerAddress = pushAddressError(errors, "Deployer", deployer);

  const suppliedAddressSettings = ADDRESS_ENV_KEYS.some((key) => read(env[key]).length > 0);
  const useLocalDefaults = network.kind === "local" && !suppliedAddressSettings;

  if (useLocalDefaults && localDefaults === undefined) {
    errors.push("Local deployment defaults require Hardhat accounts for the pool addresses.");
  }

  const name = read(env.TOKEN_NAME) || DEFAULT_TOKEN_NAME;
  const symbol = read(env.TOKEN_SYMBOL) || DEFAULT_TOKEN_SYMBOL;
  const decimalsText = read(env.TOKEN_DECIMALS) || String(TOKEN_DECIMALS);
  const initialSupply = read(env.TOKEN_INITIAL_SUPPLY) || DEFAULT_INITIAL_SUPPLY;
  const metadataInput = useLocalDefaults
    ? (localDefaults?.metadataURI ?? "")
    : read(env.TOKEN_METADATA_URI);
  const ownerInput = useLocalDefaults ? deployer : read(env.INITIAL_OWNER);
  const recipientInput = useLocalDefaults ? deployer : read(env.INITIAL_SUPPLY_RECIPIENT);
  const v2Input = useLocalDefaults ? (localDefaults?.v2PoolAddress ?? "") : read(env.UNISWAP_V2_POOL_ADDRESS);
  const v3Input = useLocalDefaults ? (localDefaults?.v3PoolAddress ?? "") : read(env.UNISWAP_V3_POOL_ADDRESS);

  if (name.length === 0 || name.length > 64) {
    errors.push("TOKEN_NAME must be 1 to 64 characters.");
  }
  if (symbol.length === 0 || symbol.length > 32) {
    errors.push("TOKEN_SYMBOL must be 1 to 32 characters.");
  }
  if (!WHOLE_NUMBER_PATTERN.test(decimalsText) || Number(decimalsText) !== TOKEN_DECIMALS) {
    errors.push("TOKEN_DECIMALS must be 18. The contract decimals function returns 18.");
  }
  let rawInitialSupply = 0n;
  if (!WHOLE_NUMBER_PATTERN.test(initialSupply)) {
    errors.push("TOKEN_INITIAL_SUPPLY must be a positive whole number of tokens.");
  } else {
    try {
      rawInitialSupply = ethers.parseUnits(initialSupply, TOKEN_DECIMALS);
      if (rawInitialSupply === 0n) {
        errors.push("TOKEN_INITIAL_SUPPLY must be a positive whole number of tokens.");
      }
    } catch {
      errors.push("TOKEN_INITIAL_SUPPLY cannot be converted with 18 decimals.");
    }
  }

  if (metadataInput.length === 0 || metadataInput.length > 512 || !METADATA_URI_PATTERN.test(metadataInput)) {
    errors.push("TOKEN_METADATA_URI must be an https:// or ipfs:// URI of at most 512 characters.");
  }

  const initialOwner = pushAddressError(errors, "INITIAL_OWNER", ownerInput);
  const initialSupplyRecipient = pushAddressError(errors, "INITIAL_SUPPLY_RECIPIENT", recipientInput);
  const v2PoolAddress = pushAddressError(errors, "UNISWAP_V2_POOL_ADDRESS", v2Input);
  const v3PoolAddress = pushAddressError(errors, "UNISWAP_V3_POOL_ADDRESS", v3Input);

  if (
    deployerAddress !== undefined &&
    initialOwner !== undefined &&
    initialOwner !== deployerAddress
  ) {
    errors.push(
      "INITIAL_OWNER must be the deployment wallet. initialize() assigns ownership to its caller.",
    );
  }
  if (
    deployerAddress !== undefined &&
    initialSupplyRecipient !== undefined &&
    initialSupplyRecipient !== deployerAddress
  ) {
    errors.push(
      "INITIAL_SUPPLY_RECIPIENT must be the deployment wallet. initialize() mints to its caller.",
    );
  }
  if (v2PoolAddress !== undefined && deployerAddress !== undefined && v2PoolAddress === deployerAddress) {
    errors.push("UNISWAP_V2_POOL_ADDRESS must not be the deployment wallet.");
  }
  if (v3PoolAddress !== undefined && deployerAddress !== undefined && v3PoolAddress === deployerAddress) {
    errors.push("UNISWAP_V3_POOL_ADDRESS must not be the deployment wallet.");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  if (
    deployerAddress === undefined ||
    initialOwner === undefined ||
    initialSupplyRecipient === undefined ||
    v2PoolAddress === undefined ||
    v3PoolAddress === undefined
  ) {
    throw new Error("Token configuration was incomplete.");
  }

  return {
    name,
    symbol,
    decimals: TOKEN_DECIMALS,
    initialSupply,
    rawInitialSupply,
    metadataURI: metadataInput,
    v2PoolAddress,
    v3PoolAddress,
    initialOwner,
    initialSupplyRecipient,
    deployer: deployerAddress,
    usingLocalDefaults: useLocalDefaults,
    networkName: network.name,
    networkKind: network.kind,
  };
}

export function describeTokenConfig(config: ResolvedTokenConfig): string {
  const poolNote =
    config.v2PoolAddress === config.v3PoolAddress
      ? "V2 and V3 pool addresses are the same. Both constraints target that single address."
      : "V2 and V3 pool addresses are different.";
  const defaultsNote = config.usingLocalDefaults
    ? "Local defaults are in use. The pool addresses are Hardhat test accounts, not Uniswap pools."
    : "Pool addresses were supplied in the environment. This project does not check that they are real pools.";

  return [
    "Independent token configuration",
    `Network: ${config.networkName} (${config.networkKind})`,
    `Name: ${config.name}`,
    `Symbol: ${config.symbol}`,
    "This symbol does not make the token Bitcoin, a Binance-issued asset, or a Bitcoin-backed asset.",
    `Decimals: ${config.decimals}`,
    `Initial supply: ${config.initialSupply} (${config.rawInitialSupply.toString()} base units)`,
    `Owner and supply recipient: ${config.initialOwner}`,
    `Metadata URI: ${config.metadataURI}`,
    `V2 pool: ${config.v2PoolAddress}`,
    `V3 pool: ${config.v3PoolAddress}`,
    poolNote,
    defaultsNote,
    "Transfer constraints start enabled. Transfers to or from the configured pools revert.",
    "Deployment does not remove constraints, add liquidity, renounce ownership, or upgrade the proxy.",
  ].join("\n");
}
