import { ethers } from "hardhat";

import { failureMessage } from "./lib/errors";
import { loadDeployedToken } from "./lib/tx";

async function main(): Promise<void> {
  const spenderText = process.env.SPENDER?.trim() ?? "";
  if (spenderText.length === 0) {
    throw new Error("SPENDER is required.");
  }
  const spender = ethers.getAddress(spenderText);
  const signers = await ethers.getSigners();
  const ownerText = process.env.ALLOWANCE_OWNER?.trim() ?? "";
  const owner = ownerText.length > 0 ? ethers.getAddress(ownerText) : signers[0]?.address;
  if (owner === undefined) {
    throw new Error("Set ALLOWANCE_OWNER or PRIVATE_KEY.");
  }

  const { tokenAddress, token } = await loadDeployedToken();
  const [symbol, decimals, allowance] = await Promise.all([
    token.symbol(),
    token.decimals(),
    token.allowance(owner, spender),
  ]);

  console.log(`Token: ${symbol} ${tokenAddress}`);
  console.log(`Owner: ${owner}`);
  console.log(`Spender: ${spender}`);
  console.log(`Allowance: ${ethers.formatUnits(allowance, decimals)} ${symbol} (${allowance.toString()} base units)`);
  if (allowance === 0n) {
    console.log("This spender cannot move the owner's tokens.");
  }
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
