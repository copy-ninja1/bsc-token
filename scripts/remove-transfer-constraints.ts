import { ethers } from "hardhat";

import { asTokenV2 } from "../types/tokenV2";
import { failureMessage } from "./lib/errors";
import { confirmPhrase } from "./lib/prompt";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork } from "./lib/safety";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  if (process.env.CONFIRM_REMOVE_CONSTRAINTS !== "true") {
    throw new Error("Set CONFIRM_REMOVE_CONSTRAINTS=true. This change is permanent for this implementation.");
  }
  if (definition.kind === "mainnet" && process.env.CONFIRM_MAINNET_DEPLOYMENT !== "true") {
    throw new Error("Set CONFIRM_MAINNET_DEPLOYMENT=true before changing mainnet constraint state.");
  }

  const configured = process.env.TOKEN_ADDRESS?.trim();
  const proxyAddress = ethers.getAddress(
    configured && configured.length > 0 ? configured : readDeploymentRecord(definition.name).proxy,
  );
  const token = asTokenV2(await ethers.getContractAt("TokenV2", proxyAddress));
  const [enabled, v2, v3] = await Promise.all([
    token.transferConstraints(),
    token.pools().then((pools) => pools[0]),
    token.pools().then((pools) => pools[1]),
  ]);
  if (!enabled) {
    throw new Error("Transfer constraints are already disabled. No transaction was sent.");
  }

  console.log(`Token: ${proxyAddress}`);
  console.log(`V2 pool: ${v2}`);
  console.log(`V3 pool: ${v3}`);
  console.log("Removing constraints permanently allows transfers to and from those addresses.");
  console.log("It does not add liquidity, create a trading pair, or guarantee exchange support.");
  await confirmPhrase("REMOVE");

  const tx = await token.removeTransferConstraints();
  const receipt = await tx.wait();
  if (receipt === null || receipt.status !== 1) {
    throw new Error("removeTransferConstraints failed.");
  }
  if (await token.transferConstraints()) {
    throw new Error("Constraints are still enabled after the transaction.");
  }
  console.log(`Constraints removed in transaction ${receipt.hash}.`);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
