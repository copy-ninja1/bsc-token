import { ethers } from "hardhat";

import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import {
  PANCAKE_V2_FACTORY,
  erc20Contract,
  pairContract,
  pancakeV2PairAddress,
  parseLpAmount,
  quoteTokenAddress,
  toBaseUnits,
} from "./lib/pancakeV2";
import {
  describeLock,
  lockAddedId,
  parseUnlockTimestamp,
  pinkLockAddress,
  pinkLockContract,
  readLock,
} from "./lib/pinkLock";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import {
  assertGasBalance,
  ensureAllowance,
  loadDeployedToken,
  printTransaction,
  requireSigner,
  send,
} from "./lib/tx";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertMainnetAction(
    definition.kind,
    "CONFIRM_LOCK_LIQUIDITY",
    "This sends LP tokens to PinkLock until the unlock date.",
  );
  const signer = await requireSigner();
  const loaded = await loadDeployedToken(signer);
  const lockerAddress = pinkLockAddress(process.env.LOCK_CONTRACT);
  const quoteAddress = quoteTokenAddress(process.env.QUOTE_TOKEN);
  const pairAddress = pancakeV2PairAddress(loaded.tokenAddress, quoteAddress);
  const unlockAt = parseUnlockTimestamp(
    process.env.LOCK_DAYS,
    process.env.LOCK_UNLOCK_AT,
    Math.floor(Date.now() / 1000),
  );
  const description = process.env.LOCK_DESCRIPTION?.trim() || "LP lock";
  const [pairCode, lockerCode] = await Promise.all([
    ethers.provider.getCode(pairAddress),
    ethers.provider.getCode(lockerAddress),
  ]);
  if (pairCode === "0x") {
    throw new Error("The PancakeSwap pair does not exist yet. Add liquidity before locking it. No transaction was sent.");
  }
  if (lockerCode === "0x") {
    throw new Error(`Lock contract ${lockerAddress} has no code. No transaction was sent.`);
  }
  const pair = erc20Contract(pairAddress, signer);
  const pairState = pairContract(pairAddress, signer);
  const locker = pinkLockContract(lockerAddress, signer);
  const [decimals, lpBalance, factory] = await Promise.all([
    pair.decimals(),
    pair.balanceOf(signer.address),
    pairState.factory(),
  ]);
  if (ethers.getAddress(factory) !== PANCAKE_V2_FACTORY) {
    throw new Error("PinkLock only accepts a pair created by the PancakeSwap V2 factory. No transaction was sent.");
  }

  const requested = parseLpAmount(process.env.LIQUIDITY_LP_AMOUNT);
  const amount = requested === "max" ? lpBalance : toBaseUnits(requested, decimals, "LIQUIDITY_LP_AMOUNT");
  if (amount <= 0n || amount > lpBalance) {
    throw new Error("The signer does not hold enough LP tokens. No transaction was sent.");
  }

  console.log(`Signer and lock owner: ${signer.address}`);
  console.log(`Locker: PinkLock V2 ${lockerAddress}`);
  console.log(`Pair: ${pairAddress}`);
  console.log(`Lock ${ethers.formatUnits(amount, decimals)} LP tokens.`);
  console.log(`Unlock date: ${new Date(unlockAt * 1000).toISOString()}`);
  console.log("The LP tokens move into PinkLock. This token contract does not record the lock.");
  console.log("After the unlock date, the lock owner withdraws from PinkLock. This command does not withdraw.");
  await assertGasBalance(signer.address, 700_000n);
  await confirmPhrase("LOCK");

  await ensureAllowance(pairAddress, signer.address, lockerAddress, amount, "LP", signer);
  const receipt = await send(
    locker.lock(signer.address, pairAddress, true, amount, BigInt(unlockAt), description),
    "Lock liquidity",
  );
  const lockId = lockAddedId(receipt.logs, lockerAddress);
  if (lockId !== undefined) {
    const lock = readLock(await locker.getLockById(lockId));
    console.log(`Lock id: ${lock.id.toString()}`);
    console.log(`Status: ${describeLock(lock, Math.floor(Date.now() / 1000))}`);
    console.log(`Unlock date: ${new Date(Number(lock.unlockDate) * 1000).toISOString()}`);
    console.log(`Locked amount: ${ethers.formatUnits(lock.amount, decimals)}`);
  }
  const recordPath = appendActionRecord(definition.name, {
    action: "lockLiquidity",
    network: definition.name,
    chainId: definition.chainId,
    token: loaded.tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Locked ${ethers.formatUnits(amount, decimals)} LP of ${pairAddress} in ${lockerAddress} until ${new Date(unlockAt * 1000).toISOString()}.`,
    at: new Date().toISOString(),
  });
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, { Token: loaded.tokenAddress, Pair: pairAddress, Locker: lockerAddress });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
