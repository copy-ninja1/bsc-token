import { ethers, type ContractRunner, type ContractTransactionResponse } from "ethers";

/** Pinksale PinkLock V2 on BNB Smart Chain. This is not a lock inside the token contract. */
export const PINKLOCK_V2 = "0x407993575c91ce7643a4d4cCACc9A98c36eE1BBE";

const PINKLOCK_ABI = [
  "function lock(address owner, address token, bool isLpToken, uint256 amount, uint256 unlockDate, string description) returns (uint256 id)",
  "function getLockById(uint256 lockId) view returns (tuple(uint256 id, address token, address owner, uint256 amount, uint256 lockDate, uint256 tgeDate, uint256 tgeBps, uint256 cycle, uint256 cycleBps, uint256 unlockedAmount, string description))",
  "function lpLocksForUser(address user) view returns (tuple(uint256 id, address token, address owner, uint256 amount, uint256 lockDate, uint256 tgeDate, uint256 tgeBps, uint256 cycle, uint256 cycleBps, uint256 unlockedAmount, string description)[])",
  "event LockAdded(uint256 indexed id, address token, address owner, uint256 amount, uint256 unlockDate)",
];

export interface PinkLock {
  lock(
    owner: string,
    token: string,
    isLpToken: boolean,
    amount: bigint,
    unlockDate: bigint,
    description: string,
  ): Promise<ContractTransactionResponse>;
  getLockById(lockId: bigint): Promise<unknown>;
  lpLocksForUser(user: string): Promise<readonly unknown[]>;
}

export interface PinkLockView {
  id: bigint;
  token: string;
  owner: string;
  amount: bigint;
  lockDate: bigint;
  unlockDate: bigint;
  tgeBps: bigint;
  unlockedAmount: bigint;
  description: string;
}

export type LockStatus = "locked" | "ready" | "withdrawn" | "vesting";

export function pinkLockAddress(configured: string | undefined): string {
  const trimmed = configured?.trim() ?? "";
  if (trimmed.length === 0) {
    return PINKLOCK_V2;
  }
  return ethers.getAddress(trimmed);
}

export function pinkLockContract(address: string, runner: ContractRunner): PinkLock {
  return new ethers.Contract(address, PINKLOCK_ABI, runner) as unknown as PinkLock;
}

export function parseUnlockTimestamp(
  daysValue: string | undefined,
  unixValue: string | undefined,
  nowSeconds: number,
): number {
  const days = daysValue?.trim() ?? "";
  const unix = unixValue?.trim() ?? "";
  if ((days.length === 0) === (unix.length === 0)) {
    throw new Error("Set exactly one of LOCK_DAYS or LOCK_UNLOCK_AT.");
  }
  if (days.length > 0) {
    if (!/^\d+$/.test(days) || Number(days) <= 0) {
      throw new Error("LOCK_DAYS must be a whole number of days greater than zero.");
    }
    return nowSeconds + Number(days) * 24 * 60 * 60;
  }
  if (!/^\d+$/.test(unix)) {
    throw new Error("LOCK_UNLOCK_AT must be a unix timestamp in seconds.");
  }
  const parsed = Number(unix);
  if (parsed <= nowSeconds) {
    throw new Error("LOCK_UNLOCK_AT must be in the future.");
  }
  return parsed;
}

function lockField(value: unknown, index: number): unknown {
  if (typeof value !== "object" || value === null || !(index in value)) {
    throw new Error("PinkLock returned a lock record this command does not understand.");
  }
  return (value as Record<number, unknown>)[index];
}

export function readLock(value: unknown): PinkLockView {
  const id = lockField(value, 0);
  const token = lockField(value, 1);
  const owner = lockField(value, 2);
  const amount = lockField(value, 3);
  const lockDate = lockField(value, 4);
  const unlockDate = lockField(value, 5);
  const tgeBps = lockField(value, 6);
  const unlockedAmount = lockField(value, 9);
  const description = lockField(value, 10);
  if (
    typeof id !== "bigint" ||
    typeof token !== "string" ||
    typeof owner !== "string" ||
    typeof amount !== "bigint" ||
    typeof lockDate !== "bigint" ||
    typeof unlockDate !== "bigint" ||
    typeof tgeBps !== "bigint" ||
    typeof unlockedAmount !== "bigint" ||
    typeof description !== "string"
  ) {
    throw new Error("PinkLock returned a lock record this command does not understand.");
  }
  return {
    id,
    token: ethers.getAddress(token),
    owner: ethers.getAddress(owner),
    amount,
    lockDate,
    unlockDate,
    tgeBps,
    unlockedAmount,
    description,
  };
}

export function describeLock(lock: PinkLockView, nowSeconds: number): LockStatus {
  if (lock.tgeBps > 0n) {
    return "vesting";
  }
  if (lock.amount > 0n && lock.unlockedAmount >= lock.amount) {
    return "withdrawn";
  }
  if (nowSeconds >= Number(lock.unlockDate)) {
    return "ready";
  }
  return "locked";
}

export function lockAddedId(
  receiptLogs: ReadonlyArray<{ address?: string; topics: readonly string[] }>,
  locker: string,
): bigint | undefined {
  const topic = ethers.id("LockAdded(uint256,address,address,uint256,uint256)");
  const lockerAddress = ethers.getAddress(locker);
  for (const log of receiptLogs) {
    if (log.address === undefined || log.topics[1] === undefined) {
      continue;
    }
    if (ethers.getAddress(log.address) !== lockerAddress || log.topics[0] !== topic) {
      continue;
    }
    return BigInt(log.topics[1]);
  }
  return undefined;
}
