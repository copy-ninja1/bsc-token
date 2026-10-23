import { ethers } from "hardhat";

import type { ResolvedTokenConfig } from "../../config/token.config";
import { asTokenV2 } from "../../types/tokenV2";

export async function assertDeployedToken(proxyAddress: string, config: ResolvedTokenConfig): Promise<void> {
  const token = asTokenV2(await ethers.getContractAt("TokenV2", proxyAddress));
  const problems: string[] = [];
  const [name, symbol, decimals, totalSupply, maxSupply, owner, metaURI, constraints, poolResult, recipientBalance] =
    await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.maxSupply(),
      token.owner(),
      token.metaURI(),
      token.transferConstraints(),
      token.pools(),
      token.balanceOf(config.initialSupplyRecipient),
    ]);

  if (name !== config.name) problems.push(`name is ${name}`);
  if (symbol !== config.symbol) problems.push(`symbol is ${symbol}`);
  if (decimals !== BigInt(config.decimals)) problems.push(`decimals are ${decimals.toString()}`);
  if (totalSupply !== config.rawInitialSupply) problems.push(`total supply is ${totalSupply.toString()}`);
  if (maxSupply !== config.rawInitialSupply) problems.push(`maxSupply is ${maxSupply.toString()}`);
  if (recipientBalance !== config.rawInitialSupply) {
    problems.push(`recipient balance is ${recipientBalance.toString()}`);
  }
  if (owner !== config.initialOwner) problems.push(`owner is ${owner}`);
  if (metaURI !== config.metadataURI) problems.push(`metadata URI is ${metaURI}`);
  if (constraints !== true) problems.push("transfer constraints are not enabled");
  if (poolResult[0] !== config.v2PoolAddress) problems.push(`V2 pool is ${poolResult[0]}`);
  if (poolResult[1] !== config.v3PoolAddress) problems.push(`V3 pool is ${poolResult[1]}`);

  const stranger = "0x0000000000000000000000000000000000000004";
  if ((await token.balanceOf(stranger)) !== 0n) {
    problems.push("an unrelated address has a balance");
  }

  if (problems.length > 0) {
    throw new Error(`Post-deployment checks failed: ${problems.join("; ")}.`);
  }
}

export async function assertImplementationHasNoSupply(implementation: string): Promise<void> {
  const token = asTokenV2(await ethers.getContractAt("TokenV2", implementation));
  const [supply, owner] = await Promise.all([token.totalSupply(), token.owner()]);
  if (supply !== 0n || owner !== ethers.ZeroAddress) {
    throw new Error("Implementation contract holds supply or ownership. It must not be used as the token.");
  }
}
