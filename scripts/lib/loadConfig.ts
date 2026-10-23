import { ethers, network } from "hardhat";

import {
  LOCAL_METADATA_URI,
  resolveTokenConfig,
  type ResolvedTokenConfig,
  type TokenEnv,
} from "../../config/token.config";

function optional(name: keyof TokenEnv): string | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function loadTokenConfig(): Promise<ResolvedTokenConfig> {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (deployer === undefined) {
    throw new Error("No deployer account is available. Set PRIVATE_KEY for a public network.");
  }

  const localDefaults =
    signers[1] !== undefined && signers[2] !== undefined
      ? {
          v2PoolAddress: signers[1].address,
          v3PoolAddress: signers[2].address,
          metadataURI: LOCAL_METADATA_URI,
        }
      : undefined;

  return resolveTokenConfig(
    {
      TOKEN_NAME: optional("TOKEN_NAME"),
      TOKEN_SYMBOL: optional("TOKEN_SYMBOL"),
      TOKEN_DECIMALS: optional("TOKEN_DECIMALS"),
      TOKEN_INITIAL_SUPPLY: optional("TOKEN_INITIAL_SUPPLY"),
      TOKEN_METADATA_URI: optional("TOKEN_METADATA_URI"),
      INITIAL_OWNER: optional("INITIAL_OWNER"),
      INITIAL_SUPPLY_RECIPIENT: optional("INITIAL_SUPPLY_RECIPIENT"),
      UNISWAP_V2_POOL_ADDRESS: optional("UNISWAP_V2_POOL_ADDRESS"),
      UNISWAP_V3_POOL_ADDRESS: optional("UNISWAP_V3_POOL_ADDRESS"),
    },
    network.name,
    deployer.address,
    localDefaults,
  );
}
