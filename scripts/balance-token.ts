import { ethers } from "hardhat";

import { failureMessage } from "./lib/errors";
import { loadDeployedToken } from "./lib/tx";

async function main(): Promise<void> {
  const signers = await ethers.getSigners();
  const configured = process.env.BALANCE_ACCOUNT?.trim() ?? "";
  const account = configured.length > 0 ? ethers.getAddress(configured) : signers[0]?.address;
  if (account === undefined) {
    throw new Error("Set BALANCE_ACCOUNT or PRIVATE_KEY.");
  }

  const { tokenAddress, token } = await loadDeployedToken();
  const [symbol, decimals, balance, native] = await Promise.all([
    token.symbol(),
    token.decimals(),
    token.balanceOf(account),
    ethers.provider.getBalance(account),
  ]);

  console.log(`Account: ${account}`);
  console.log(`Token: ${symbol} ${tokenAddress}`);
  console.log(`${symbol} balance: ${ethers.formatUnits(balance, decimals)} (${balance.toString()} base units)`);
  console.log(`BNB balance: ${ethers.formatEther(native)}`);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
