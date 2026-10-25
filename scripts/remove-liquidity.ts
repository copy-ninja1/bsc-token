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
  pairContract,
  pancakeV2PairAddress,
  parseLpAmount,
  parseSlippageBps,
  proRataAmount,
  quoteTokenAddress,
  routerContract,
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
  assertMainnetAction(
    definition.kind,
    "CONFIRM_REMOVE_LIQUIDITY",
    "This withdraws the signer's liquidity from the PancakeSwap pair.",
  );

  const requested = parseLpAmount(process.env.LIQUIDITY_LP_AMOUNT);
  const slippageBps = parseSlippageBps(process.env.LIQUIDITY_SLIPPAGE_BPS);
  const quoteAddress = quoteTokenAddress(process.env.QUOTE_TOKEN);
  const signer = await requireSigner();
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);
  const pairAddress = pancakeV2PairAddress(tokenAddress, quoteAddress);
  if ((await ethers.provider.getCode(pairAddress)) === "0x") {
    throw new Error(`The PancakeSwap pair ${pairAddress} does not exist yet. No transaction was sent.`);
  }

  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, signer));
  const quote = erc20Contract(quoteAddress, signer);
  const pair = pairContract(pairAddress, signer);
  const router = routerContract(signer);
  const [symbol, decimals, quoteSymbol, quoteDecimals, constraints, pools, factory, lpBalance, lpDecimals, totalSupply, token0, reserves] =
    await Promise.all([
      token.symbol(),
      token.decimals(),
      quote.symbol(),
      quote.decimals(),
      token.transferConstraints(),
      token.pools(),
      router.factory(),
      pair.balanceOf(signer.address),
      pair.decimals(),
      pair.totalSupply(),
      pair.token0(),
      pair.getReserves(),
    ]);
  if (ethers.getAddress(factory) !== PANCAKE_V2_FACTORY) {
    throw new Error("The PancakeSwap router did not return the V2 factory. No transaction was sent.");
  }
  assertPairNotConstrained(constraints, pairAddress, pools[0], pools[1]);
  if (lpBalance <= 0n) {
    throw new Error("The signer holds no LP tokens for this pair. No transaction was sent.");
  }

  const liquidity = requested === "max" ? lpBalance : toBaseUnits(requested, lpDecimals, "LIQUIDITY_LP_AMOUNT");
  if (liquidity > lpBalance) {
    throw new Error("LIQUIDITY_LP_AMOUNT is above the signer's LP balance. No transaction was sent.");
  }
  const tokenReserve = token0 === tokenAddress ? reserves[0] : reserves[1];
  const quoteReserve = token0 === tokenAddress ? reserves[1] : reserves[0];
  let tokenOut: bigint;
  let quoteOut: bigint;
  try {
    tokenOut = proRataAmount(liquidity, tokenReserve, totalSupply);
    quoteOut = proRataAmount(liquidity, quoteReserve, totalSupply);
  } catch (error: unknown) {
    throw new Error(failureMessage(error));
  }
  const tokenMinimum = minimumAmount(tokenOut, slippageBps);
  const quoteMinimum = minimumAmount(quoteOut, slippageBps);

  console.log(`Signer: ${signer.address}`);
  console.log(`Pair: ${pairAddress}`);
  console.log(`Withdrawing ${ethers.formatUnits(liquidity, lpDecimals)} LP tokens.`);
  console.log(`Expected ${symbol}: ${ethers.formatUnits(tokenOut, decimals)}`);
  console.log(`Expected ${quoteSymbol}: ${ethers.formatUnits(quoteOut, quoteDecimals)}`);
  console.log(`Minimum ${symbol}: ${ethers.formatUnits(tokenMinimum, decimals)}`);
  console.log(`Minimum ${quoteSymbol}: ${ethers.formatUnits(quoteMinimum, quoteDecimals)}`);
  if (quoteAddress === BTCB) {
    console.log("The quote asset returned is Binance-Peg BTCB, not native Bitcoin.");
  }
  console.log("The withdrawn tokens return to the signer. This command does not lock them.");
  await assertGasBalance(signer.address, 600_000n);
  console.log("Review the withdrawal above.");
  await confirmPhrase("REMOVE_LIQUIDITY");

  await ensureAllowance(pairAddress, signer.address, PANCAKE_V2_ROUTER, liquidity, "LP", signer);
  const receipt = await send(
    router.removeLiquidity(
      tokenAddress,
      quoteAddress,
      liquidity,
      tokenMinimum,
      quoteMinimum,
      signer.address,
      actionDeadline(LIQUIDITY_DEADLINE_SECONDS),
    ),
    "Remove liquidity",
  );
  const recordPath = appendActionRecord(definition.name, {
    action: "removeLiquidity",
    network: definition.name,
    chainId: definition.chainId,
    token: tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Withdrew ${ethers.formatUnits(liquidity, lpDecimals)} LP from ${pairAddress}.`,
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
