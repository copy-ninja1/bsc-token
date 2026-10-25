import type { ContractTransactionResponse } from "ethers";
import { ethers, upgrades } from "hardhat";

import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import {
  PAUSED_SIGNATURE,
  PAUSE_SIGNATURE,
  UNPAUSE_SIGNATURE,
  bytecodeHasSelector,
} from "./lib/selectors";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import { assertGasBalance, loadDeployedToken, printTransaction, requireSigner, send } from "./lib/tx";

type PauseAction = "pause" | "unpause";

function readAction(): PauseAction {
  const action = process.env.PAUSE_ACTION;
  switch (action) {
    case "pause":
    case "unpause":
      return action;
    default:
      throw new Error("Set PAUSE_ACTION to pause or unpause.");
  }
}

function signatureFor(action: PauseAction): string {
  switch (action) {
    case "pause":
      return PAUSE_SIGNATURE;
    case "unpause":
      return UNPAUSE_SIGNATURE;
    default: {
      const unsupported: never = action;
      throw new Error(`Unsupported pause action: ${String(unsupported)}`);
    }
  }
}

async function main(): Promise<void> {
  const action = readAction();
  const definition = await assertConnectedNetwork();
  const flag = action === "pause" ? "CONFIRM_PAUSE" : "CONFIRM_UNPAUSE";
  const requirement = action === "pause"
    ? "This stops transfers if the implementation has pause and the signer is allowed to call it."
    : "This resumes transfers if the implementation has unpause and the signer is allowed to call it.";
  assertMainnetAction(definition.kind, flag, requirement);

  const signer = await requireSigner();
  const loaded = await loadDeployedToken(signer);
  const implementation = await upgrades.erc1967.getImplementationAddress(loaded.tokenAddress);
  const code = await ethers.provider.getCode(implementation);
  console.log(`Token: ${loaded.tokenAddress}`);
  console.log(`Implementation: ${implementation}`);
  if (!bytecodeHasSelector(code, signatureFor(action))) {
    console.log(`This implementation has no ${signatureFor(action)} function. No transaction was sent.`);
    throw new Error("Pause controls are not available on the current implementation.");
  }
  if (bytecodeHasSelector(code, PAUSED_SIGNATURE)) {
    const state = new ethers.Contract(loaded.tokenAddress, ["function paused() view returns (bool)"], signer) as unknown as {
      paused(): Promise<boolean>;
    };
    console.log(`Transfers are currently ${await state.paused() ? "paused" : "active"}.`);
  }
  console.log(`The next transaction calls ${signatureFor(action)}. It reverts when the signer does not have that permission.`);
  await assertGasBalance(signer.address, 100_000n);
  await confirmPhrase(action === "pause" ? "PAUSE" : "UNPAUSE");

  const caller = new ethers.Contract(
    loaded.tokenAddress,
    [`function ${signatureFor(action)}`],
    signer,
  ) as unknown as {
    pause(): Promise<ContractTransactionResponse>;
    unpause(): Promise<ContractTransactionResponse>;
  };
  const pending = action === "pause" ? caller.pause() : caller.unpause();
  const receipt = await send(pending, action === "pause" ? "Pause" : "Unpause");
  const recordPath = appendActionRecord(definition.name, {
    action,
    network: definition.name,
    chainId: definition.chainId,
    token: loaded.tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Called ${signatureFor(action)} on ${loaded.tokenAddress}.`,
    at: new Date().toISOString(),
  });
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, { Token: loaded.tokenAddress });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
