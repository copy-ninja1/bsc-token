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
    "CONFIRM_RENOUNCE_OWNERSHIP",
    "This permanently removes the token owner.",
  );

  const signer = await requireSigner();
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);
  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, signer));
  const [owner, constraints] = await Promise.all([token.owner(), token.transferConstraints()]);
  if (owner !== signer.address) {
    throw new Error(`Signer ${signer.address} is not the token owner ${owner}. No transaction was sent.`);
  }

  console.log(`Token: ${tokenAddress}`);
  console.log(`Current owner: ${owner}`);
  console.log("Renouncing sets the owner to the zero address. It cannot be undone.");
  if (constraints) {
    console.log("Transfer constraints are still on. After this transaction, nobody can turn them off.");
  }
  console.log("Proxy admin ownership does not change. The proxy can still be upgraded by the proxy admin.");
  await assertGasBalance(signer.address, 150_000n);
  console.log("Review the renounce above.");
  await confirmPhrase("RENOUNCE");

  const receipt = await send(token.renounceOwnership(), "Renounce ownership");
  const updated = await token.owner();
  if (updated !== ethers.ZeroAddress) {
    throw new Error(`Owner is ${updated} after the transaction. Renounce did not clear it.`);
  }
  const recordPath = appendActionRecord(definition.name, {
    action: "renounceOwnership",
    network: definition.name,
    chainId: definition.chainId,
    token: tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Token owner ${owner} renounced ownership.`,
    at: new Date().toISOString(),
  });
  console.log("The token owner is now the zero address.");
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, { Token: tokenAddress });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
