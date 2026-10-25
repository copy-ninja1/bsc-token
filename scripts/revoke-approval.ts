import { ethers } from "hardhat";

import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import { assertGasBalance, loadDeployedToken, printTransaction, requireSigner, send } from "./lib/tx";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertMainnetAction(
    definition.kind,
    "CONFIRM_REVOKE_APPROVAL",
    "This sets the signer's allowance for SPENDER to zero.",
  );
  const spenderText = process.env.SPENDER?.trim() ?? "";
  if (spenderText.length === 0) {
    throw new Error("SPENDER is required.");
  }
  const spender = ethers.getAddress(spenderText);
  const signer = await requireSigner();
  const ownerText = process.env.ALLOWANCE_OWNER?.trim() ?? "";
  if (ownerText.length > 0 && ethers.getAddress(ownerText) !== signer.address) {
    throw new Error("Only the wallet that granted the allowance can revoke it. ALLOWANCE_OWNER must be the signer.");
  }

  const loaded = await loadDeployedToken(signer);
  const token = loaded.token;
  const [symbol, decimals, allowance] = await Promise.all([
    token.symbol(),
    token.decimals(),
    token.allowance(signer.address, spender),
  ]);
  console.log(`Token: ${symbol} ${loaded.tokenAddress}`);
  console.log(`Owner: ${signer.address}`);
  console.log(`Spender: ${spender}`);
  console.log(`Current allowance: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);
  if (allowance === 0n) {
    console.log("The allowance is already zero. No transaction was sent.");
    return;
  }
  console.log("The next transaction sets this allowance to zero. It does not move tokens.");
  await assertGasBalance(signer.address, 80_000n);
  await confirmPhrase("REVOKE");

  const receipt = await send(token.approve(spender, 0n), "Revoke approval");
  const updated = await token.allowance(signer.address, spender);
  if (updated !== 0n) {
    throw new Error(`Allowance is still ${updated.toString()} after the transaction.`);
  }
  const recordPath = appendActionRecord(definition.name, {
    action: "revokeApproval",
    network: definition.name,
    chainId: definition.chainId,
    token: loaded.tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Revoked ${symbol} allowance for ${spender}.`,
    at: new Date().toISOString(),
  });
  console.log("Allowance is now zero.");
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, { Token: loaded.tokenAddress, Spender: spender });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
