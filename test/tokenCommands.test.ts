import { expect } from "chai";

import { describeLock, parseUnlockTimestamp, readLock, type PinkLockView } from "../scripts/lib/pinkLock";
import { bytecodeHasSelector } from "../scripts/lib/selectors";

const TOKEN = "0x0000000000000000000000000000000000000006";
const OWNER = "0x0000000000000000000000000000000000000007";

function lock(overrides: Partial<PinkLockView> = {}): PinkLockView {
  return {
    id: 1n,
    token: TOKEN,
    owner: OWNER,
    amount: 100n,
    lockDate: 1_700_000_000n,
    unlockDate: 1_800_000_000n,
    tgeBps: 0n,
    unlockedAmount: 0n,
    description: "LP lock",
    ...overrides,
  };
}

describe("Token command helpers", () => {
  it("finds a function selector in runtime bytecode", () => {
    const code = `0x${"42966c68"}`;
    expect(bytecodeHasSelector(code, "burn(uint256)")).to.equal(true);
    expect(bytecodeHasSelector("0x", "burn(uint256)")).to.equal(false);
    expect(bytecodeHasSelector(code, "pause()")).to.equal(false);
  });

  it("requires a future unlock date from exactly one setting", () => {
    expect(parseUnlockTimestamp("2", undefined, 1_000)).to.equal(1_000 + 2 * 24 * 60 * 60);
    expect(parseUnlockTimestamp(undefined, "5000", 1_000)).to.equal(5_000);
    expect(() => parseUnlockTimestamp("1", "5000", 1_000)).to.throw("exactly one");
    expect(() => parseUnlockTimestamp(undefined, "1000", 1_000)).to.throw("in the future");
  });

  it("reads a PinkLock record and describes its status", () => {
    const parsed = readLock([
      7n,
      TOKEN,
      OWNER,
      100n,
      1_700_000_000n,
      1_800_000_000n,
      0n,
      0n,
      0n,
      0n,
      "LP lock",
    ]);
    expect(parsed.id).to.equal(7n);
    expect(parsed.token).to.equal(TOKEN);
    expect(describeLock(lock(), 1_700_000_100)).to.equal("locked");
    expect(describeLock(lock(), 1_800_000_000)).to.equal("ready");
    expect(describeLock(lock({ unlockedAmount: 100n }), 1_700_000_100)).to.equal("withdrawn");
    expect(describeLock(lock({ tgeBps: 100n }), 1_900_000_000)).to.equal("vesting");
  });
});
