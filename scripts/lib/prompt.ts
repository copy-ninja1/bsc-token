import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import type { NetworkKind } from "../../config/networks";

function confirmationFlag(kind: NetworkKind): string | undefined {
  switch (kind) {
    case "local":
      return undefined;
    case "testnet":
      return "CONFIRM_TESTNET_DEPLOYMENT";
    case "mainnet":
      return "CONFIRM_MAINNET_DEPLOYMENT";
    default: {
      const unsupported: never = kind;
      throw new Error(`Unsupported network kind: ${String(unsupported)}`);
    }
  }
}

export function assertMainnetAction(kind: NetworkKind, flag: string, requirement: string): void {
  if (kind !== "mainnet") {
    throw new Error("This command runs on BNB Smart Chain mainnet only.");
  }
  if (process.env.CONFIRM_MAINNET_DEPLOYMENT !== "true") {
    throw new Error("Set CONFIRM_MAINNET_DEPLOYMENT=true before this mainnet action.");
  }
  if (process.env[flag] !== "true") {
    throw new Error(`Set ${flag}=true. ${requirement}`);
  }
}

export function assertAddLiquidityAllowed(kind: NetworkKind): void {
  assertMainnetAction(kind, "CONFIRM_ADD_LIQUIDITY", "This spends the token and BTCB from the signer.");
}

export async function confirmDeployment(kind: NetworkKind): Promise<void> {
  const flag = confirmationFlag(kind);
  if (flag === undefined) {
    return;
  }
  if (process.env[flag] !== "true") {
    throw new Error(`Set ${flag}=true before deploying to this network.`);
  }
  await confirmPhrase("DEPLOY");
}

export async function confirmPhrase(expected: string): Promise<void> {
  if (!input.isTTY) {
    if (process.env.DEPLOY_CONFIRMATION !== expected) {
      throw new Error(
        `Set DEPLOY_CONFIRMATION=${expected} to confirm this non-interactive operation.`,
      );
    }
    return;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`Type ${expected} to continue: `);
    if (answer.trim() !== expected) {
      throw new Error("Confirmation phrase did not match. The operation was aborted.");
    }
  } finally {
    rl.close();
  }
}
