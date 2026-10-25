import { ethers } from "hardhat";

import { failureMessage } from "./lib/errors";
import {
  describeLock,
  pinkLockAddress,
  pinkLockContract,
  readLock,
  type PinkLockView,
} from "./lib/pinkLock";
import { erc20Contract, pancakeV2PairAddress, quoteTokenAddress } from "./lib/pancakeV2";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import { loadDeployedToken } from "./lib/tx";

function printLock(lock: PinkLockView, decimals: bigint, nowSeconds: number): void {
  const status = describeLock(lock, nowSeconds);
  console.log(`Lock ${lock.id.toString()}: ${status}`);
  console.log(`  Token: ${lock.token}`);
  console.log(`  Owner: ${lock.owner}`);
  console.log(`  Amount: ${ethers.formatUnits(lock.amount, decimals)} (${lock.amount.toString()} base units)`);
  console.log(`  Locked at: ${new Date(Number(lock.lockDate) * 1000).toISOString()}`);
  console.log(`  Unlock date: ${new Date(Number(lock.unlockDate) * 1000).toISOString()}`);
  console.log(`  Unlocked amount: ${ethers.formatUnits(lock.unlockedAmount, decimals)}`);
  if (lock.description.length > 0) {
    console.log(`  Description: ${lock.description}`);
  }
}

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  if (definition.kind !== "mainnet") {
    throw new Error("This command runs on BNB Smart Chain mainnet only.");
  }
  const signers = await ethers.getSigners();
  const ownerText = process.env.LOCK_OWNER?.trim() ?? "";
  const owner = ownerText.length > 0 ? ethers.getAddress(ownerText) : signers[0]?.address;
  if (owner === undefined) {
    throw new Error("Set LOCK_OWNER or PRIVATE_KEY.");
  }
  const lockerAddress = pinkLockAddress(process.env.LOCK_CONTRACT);
  const { tokenAddress } = await loadDeployedToken();
  const quoteAddress = quoteTokenAddress(process.env.QUOTE_TOKEN);
  const pairAddress = pancakeV2PairAddress(tokenAddress, quoteAddress);
  const pair = erc20Contract(pairAddress, ethers.provider);
  const locker = pinkLockContract(lockerAddress, ethers.provider);
  const [pairCode, lockerCode, decimals, walletLp] = await Promise.all([
    ethers.provider.getCode(pairAddress),
    ethers.provider.getCode(lockerAddress),
    pair.decimals().catch(() => 18n),
    pair.balanceOf(owner).catch(() => 0n),
  ]);
  if (lockerCode === "0x") {
    throw new Error(`Lock contract ${lockerAddress} has no code on this network.`);
  }

  console.log(`Locker: ${lockerAddress}`);
  console.log(`Pair: ${pairAddress}`);
  console.log(`Wallet LP balance: ${pairCode === "0x" ? "no pair yet" : ethers.formatUnits(walletLp, decimals)}`);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const locks = (await locker.lpLocksForUser(owner)).map(readLock).filter((lock) => lock.token === pairAddress);
  if (locks.length === 0) {
    console.log(`PinkLock has no LP lock for ${owner} on this pair.`);
  }
  for (const lock of locks) {
    printLock(lock, decimals, nowSeconds);
  }

  const lockIdText = process.env.LOCK_ID?.trim() ?? "";
  if (lockIdText.length > 0) {
    if (!/^\d+$/.test(lockIdText)) {
      throw new Error("LOCK_ID must be a whole number.");
    }
    const selected = readLock(await locker.getLockById(BigInt(lockIdText)));
    console.log("Requested lock:");
    printLock(selected, decimals, nowSeconds);
  }
  printExplorers(definition, { Token: tokenAddress, Pair: pairAddress, Locker: lockerAddress });
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
