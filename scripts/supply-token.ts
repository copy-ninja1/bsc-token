import { ethers } from "hardhat";

import { failureMessage } from "./lib/errors";
import { loadDeployedToken } from "./lib/tx";

async function main(): Promise<void> {
  const { tokenAddress, token } = await loadDeployedToken();
  const [name, symbol, decimals, totalSupply, maxSupply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.maxSupply(),
  ]);

  console.log(`Token: ${name} (${symbol}) ${tokenAddress}`);
  console.log(`${symbol} is the configured symbol of an independent token. It is not Bitcoin.`);
  console.log(`Decimals: ${decimals.toString()}`);
  console.log(`Current supply: ${ethers.formatUnits(totalSupply, decimals)} (${totalSupply.toString()} base units)`);
  console.log(`Supply minted at initialization: ${ethers.formatUnits(maxSupply, decimals)} (${maxSupply.toString()} base units)`);
  console.log("TokenV2 has no burn function. Current supply changes only if a later implementation adds one.");
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
