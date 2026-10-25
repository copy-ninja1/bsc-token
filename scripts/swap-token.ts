import { ethers } from "hardhat";

import { asTokenV2 } from "../types/tokenV2";
import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import {
  BTCB,
  LIQUIDITY_DEADLINE_SECONDS,
  PANCAKE_V2_FACTORY,
  PANCAKE_V2_ROUTER,
  assertPairNotConstrained,
  erc20Contract,
  minimumAmount,
  pancakeV2PairAddress,
  parseSlippageBps,
  quoteTokenAddress,
  resolveSwapQuoteAmount,
  routerContract,
  selectSwapAmounts,
  swapPath,
  toBaseUnits,
} from "./lib/pancakeV2";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import {
  actionDeadline,
  assertGasBalance,
  ensureAllowance,
  printTransaction,
  requireSigner,
  resolveProxyAddress,
  send,
} from "./lib/tx";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertMainnetAction(definition.kind, "CONFIRM_SWAP", "This swaps the token and the quote asset from the signer.");

  const quoteInput = resolveSwapQuoteAmount(process.env.SWAP_QUOTE_AMOUNT, process.env.SWAP_BTCB_AMOUNT);
  const selection = selectSwapAmounts(quoteInput, process.env.SWAP_TOKEN_AMOUNT);
  const slippageBps = parseSlippageBps(process.env.LIQUIDITY_SLIPPAGE_BPS);
  const quoteAddress = quoteTokenAddress(process.env.QUOTE_TOKEN);
  const signer = await requireSigner();
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);
  const path = swapPath(selection.direction, tokenAddress, quoteAddress);
  const pairAddress = pancakeV2PairAddress(tokenAddress, quoteAddress);

  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, signer));
  const quote = erc20Contract(quoteAddress, signer);
  const router = routerContract(signer);
  const [symbol, decimals, quoteSymbol, quoteDecimals, constraints, pools, factory] = await Promise.all([
    token.symbol(),
    token.decimals(),
    quote.symbol(),
    quote.decimals(),
    token.transferConstraints(),
    token.pools(),
    router.factory(),
  ]);
  if (ethers.getAddress(factory) !== PANCAKE_V2_FACTORY) {
    throw new Error("The PancakeSwap router did not return the V2 factory. No transaction was sent.");
  }
  assertPairNotConstrained(constraints, pairAddress, pools[0], pools[1]);

  const sellingQuote = selection.direction === "quoteForToken";
  const inputDecimals = sellingQuote ? quoteDecimals : decimals;
  const outputDecimals = sellingQuote ? decimals : quoteDecimals;
  const inputSymbol = sellingQuote ? quoteSymbol : symbol;
  const outputSymbol = sellingQuote ? symbol : quoteSymbol;
  const amountIn = toBaseUnits(selection.amountText, inputDecimals, selection.amountName);
  const inputToken = path[0];
  const inputBalance = await erc20Contract(inputToken, signer).balanceOf(signer.address);

  let expectedOut: bigint;
  try {
    const amounts = await router.getAmountsOut(amountIn, path);
    const last = amounts[amounts.length - 1];
    if (last === undefined || last <= 0n) {
      throw new Error("The router returned no output amount.");
    }
    expectedOut = last;
  } catch (error: unknown) {
    const reason = failureMessage(error);
    throw new Error(`The pair has no usable price yet. Add liquidity before swapping. ${reason}`);
  }
  const amountOutMin = minimumAmount(expectedOut, slippageBps);

  console.log(`Signer: ${signer.address}`);
  console.log(
    `Swap ${ethers.formatUnits(amountIn, inputDecimals)} ${inputSymbol} for about ${ethers.formatUnits(expectedOut, outputDecimals)} ${outputSymbol}.`,
  );
  console.log(`Minimum received: ${ethers.formatUnits(amountOutMin, outputDecimals)} ${outputSymbol}.`);
  console.log(`Path: ${path.join(" -> ")}`);
  console.log(`Pair: ${pairAddress}`);
  console.log(`Router: ${PANCAKE_V2_ROUTER}`);
  if (quoteAddress === BTCB) {
    console.log("The quote asset is Binance-Peg BTCB, not native Bitcoin.");
  }
  console.log("This is one swap. It does not repeat.");
  if (inputBalance < amountIn) {
    throw new Error(`Signer ${inputSymbol} balance is below the swap amount. No transaction was sent.`);
  }
  await assertGasBalance(signer.address, 500_000n);
  console.log("Review the swap above.");
  await confirmPhrase("SWAP");

  await ensureAllowance(inputToken, signer.address, PANCAKE_V2_ROUTER, amountIn, inputSymbol, signer);
  const receipt = await send(
    router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      signer.address,
      actionDeadline(LIQUIDITY_DEADLINE_SECONDS),
    ),
    "Swap",
  );
  const recordPath = appendActionRecord(definition.name, {
    action: "swap",
    network: definition.name,
    chainId: definition.chainId,
    token: tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Swapped ${selection.amountText} ${inputSymbol} for ${outputSymbol}.`,
    at: new Date().toISOString(),
  });
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, { Token: tokenAddress, Quote: quoteAddress, Pair: pairAddress });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
