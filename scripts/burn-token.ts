import type { ContractTransactionResponse } from "ethers";
import { ethers, upgrades } from "hardhat";

import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import { parsePositiveAmount, toBaseUnits } from "./lib/pancakeV2";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import { BURN_FROM_SIGNATURE, BURN_SIGNATURE, bytecodeHasSelector } from "./lib/selectors";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import { assertGasBalance, loadDeployedToken, printTransaction, requireSigner, send } from "./lib/tx";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertMainnetAction(definition.kind, "CONFIRM_BURN", "This permanently destroys tokens from the signer.");
  const signer = await requireSigner();
  const loaded = await loadDeployedToken(signer);
  const implementation = await upgrades.erc1967.getImplementationAddress(loaded.tokenAddress);
  const code = await ethers.provider.getCode(implementation);
  const burnsCaller = bytecodeHasSelector(code, BURN_SIGNATURE);
  const burnsFromAllowance = bytecodeHasSelector(code, BURN_FROM_SIGNATURE);

  console.log(`Token: ${loaded.tokenAddress}`);
  console.log(`Implementation: ${implementation}`);
  if (!burnsCaller) {
    console.log("This implementation has no burn(uint256) function. No transaction was sent.");
    if (burnsFromAllowance) {
      console.log("burnFrom(address,uint256) is present. It spends an allowance instead of the caller's own balance. This command does not call it.");
    }
    throw new Error("Token burning is not available on the current implementation.");
  }

  const amountText = parsePositiveAmount(process.env.BURN_AMOUNT, "BURN_AMOUNT");
  const decimals = await loaded.token.decimals();
  const symbol = await loaded.token.symbol();
  const amount = toBaseUnits(amountText, decimals, "BURN_AMOUNT");
  const balance = await loaded.token.balanceOf(signer.address);
  console.log(`burn(uint256) burns the signer's own ${symbol}. It cannot burn another wallet's tokens.`);
  console.log(`Burn ${ethers.formatUnits(amount, decimals)} ${symbol}.`);
  console.log(`Signer balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  if (balance < amount) {
    throw new Error("Signer balance is below the burn amount. No transaction was sent.");
  }
  await assertGasBalance(signer.address, 120_000n);
  await confirmPhrase("BURN");

  const burner = new ethers.Contract(
    loaded.tokenAddress,
    ["function burn(uint256 amount)"],
    signer,
  ) as unknown as { burn(amount: bigint): Promise<ContractTransactionResponse> };
  const receipt = await send(burner.burn(amount), "Burn");
  const recordPath = appendActionRecord(definition.name, {
    action: "burn",
    network: definition.name,
    chainId: definition.chainId,
    token: loaded.tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Burned ${amountText} ${symbol} from ${signer.address}.`,
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
