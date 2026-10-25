import { ethers } from "hardhat";

import { asTokenV2 } from "../types/tokenV2";
import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import { assertGasBalance, printTransaction, requireSigner, resolveProxyAddress, send } from "./lib/tx";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertMainnetAction(
    definition.kind,
    "CONFIRM_TRANSFER_OWNERSHIP",
    "This hands token ownership to NEW_OWNER.",
  );

  const nextText = process.env.NEW_OWNER?.trim() ?? "";
  if (nextText.length === 0) {
    throw new Error("NEW_OWNER is required.");
  }
  const nextOwner = ethers.getAddress(nextText);
  if (nextOwner === ethers.ZeroAddress) {
    throw new Error("NEW_OWNER cannot be the zero address. Renouncing ownership is a separate command.");
  }

  const signer = await requireSigner();
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);
  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, signer));
  const owner = await token.owner();
  if (owner !== signer.address) {
    throw new Error(`Signer ${signer.address} is not the token owner ${owner}. No transaction was sent.`);
  }
  if (nextOwner === owner) {
    throw new Error("NEW_OWNER is already the token owner. No transaction was sent.");
  }

  console.log(`Token: ${tokenAddress}`);
  console.log(`Current owner: ${owner}`);
  console.log(`New owner: ${nextOwner}`);
  console.log("The new owner will be able to remove transfer constraints and transfer ownership again.");
  console.log("Proxy admin ownership does not move with this transaction.");
  await assertGasBalance(signer.address, 150_000n);
  console.log("Review the ownership change above.");
  await confirmPhrase("TRANSFER_OWNERSHIP");

  const receipt = await send(token.transferOwnership(nextOwner), "Ownership transfer");
  const updated = await token.owner();
  if (updated !== nextOwner) {
    throw new Error(`Owner is ${updated} after the transaction, not ${nextOwner}.`);
  }
  const recordPath = appendActionRecord(definition.name, {
    action: "transferOwnership",
    network: definition.name,
    chainId: definition.chainId,
    token: tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Token owner changed from ${owner} to ${nextOwner}.`,
    at: new Date().toISOString(),
  });
  console.log(`Owner is now ${updated}.`);
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, { Token: tokenAddress, Owner: updated });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
