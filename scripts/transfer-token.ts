import { ethers } from "hardhat";

import { asTokenV2 } from "../types/tokenV2";
import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import { assertTransferAllowed, parsePositiveAmount, toBaseUnits } from "./lib/pancakeV2";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import { assertGasBalance, printTransaction, requireSigner, resolveProxyAddress, send } from "./lib/tx";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertMainnetAction(definition.kind, "CONFIRM_TRANSFER", "This sends tokens from the signer to TRANSFER_TO.");

  const amountText = parsePositiveAmount(process.env.TRANSFER_AMOUNT, "TRANSFER_AMOUNT");
  const recipientText = process.env.TRANSFER_TO?.trim() ?? "";
  if (recipientText.length === 0) {
    throw new Error("TRANSFER_TO is required.");
  }
  const recipient = ethers.getAddress(recipientText);
  if (recipient === ethers.ZeroAddress) {
    throw new Error("TRANSFER_TO cannot be the zero address.");
  }

  const signer = await requireSigner();
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);
  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, signer));
  const [symbol, decimals, constraints, pools, balance] = await Promise.all([
    token.symbol(),
    token.decimals(),
    token.transferConstraints(),
    token.pools(),
    token.balanceOf(signer.address),
  ]);
  assertTransferAllowed(constraints, signer.address, recipient, pools[0], pools[1]);
  const amount = toBaseUnits(amountText, decimals, "TRANSFER_AMOUNT");
  if (balance < amount) {
    throw new Error(`Signer ${symbol} balance is below the transfer amount. No transaction was sent.`);
  }

  console.log(`Signer: ${signer.address}`);
  console.log(`Token: ${symbol} ${tokenAddress}`);
  console.log(`Send ${ethers.formatUnits(amount, decimals)} ${symbol} to ${recipient}.`);
  console.log(`${symbol} balance: ${ethers.formatUnits(balance, decimals)}`);
  await assertGasBalance(signer.address, 200_000n);
  console.log("Review the transfer above.");
  await confirmPhrase("TRANSFER");

  const receipt = await send(token.transfer(recipient, amount), "Transfer");
  const recordPath = appendActionRecord(definition.name, {
    action: "transfer",
    network: definition.name,
    chainId: definition.chainId,
    token: tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Sent ${amountText} ${symbol} to ${recipient}.`,
    at: new Date().toISOString(),
  });
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, { Token: tokenAddress, Recipient: recipient });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
