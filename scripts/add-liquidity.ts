import { ethers } from "hardhat";

import { asTokenV2 } from "../types/tokenV2";
import { failureMessage } from "./lib/errors";
import { appendLiquidityRecord } from "./lib/liquidityRecord";
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
  parsePositiveAmount,
  parseSlippageBps,
  quoteTokenAddress,
  routerContract,
  toBaseUnits,
} from "./lib/pancakeV2";
import { assertAddLiquidityAllowed, confirmPhrase } from "./lib/prompt";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import {
  actionDeadline,
  ensureAllowance,
  printTransaction,
  requireSigner,
  resolveProxyAddress,
  send,
} from "./lib/tx";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertAddLiquidityAllowed(definition.kind);

  const tokenAmountText = parsePositiveAmount(process.env.LIQUIDITY_TOKEN_AMOUNT, "LIQUIDITY_TOKEN_AMOUNT");
  const quoteAmountText = parsePositiveAmount(process.env.LIQUIDITY_QUOTE_AMOUNT, "LIQUIDITY_QUOTE_AMOUNT");
  const slippageBps = parseSlippageBps(process.env.LIQUIDITY_SLIPPAGE_BPS);
  const quoteAddress = quoteTokenAddress(process.env.QUOTE_TOKEN);

  const signer = await requireSigner();
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);

  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, signer));
  const quote = erc20Contract(quoteAddress, signer);
  const router = routerContract(signer);
  const pairAddress = pancakeV2PairAddress(tokenAddress, quoteAddress);

  const [tokenSymbol, tokenDecimals, quoteSymbol, quoteDecimals, constraints, pools, factory, tokenCode, quoteCode] =
    await Promise.all([
      token.symbol(),
      token.decimals(),
      quote.symbol(),
      quote.decimals(),
      token.transferConstraints(),
      token.pools(),
      router.factory(),
      ethers.provider.getCode(tokenAddress),
      ethers.provider.getCode(quoteAddress),
    ]);

  if (tokenCode === "0x") {
    throw new Error(`Token ${tokenAddress} has no contract code on this network.`);
  }
  if (quoteCode === "0x") {
    throw new Error(`Quote token ${quoteAddress} has no contract code on this network.`);
  }
  if (ethers.getAddress(factory) !== PANCAKE_V2_FACTORY) {
    throw new Error("The PancakeSwap router did not return the V2 factory. No transaction was sent.");
  }
  assertPairNotConstrained(constraints, pairAddress, pools[0], pools[1]);

  const tokenAmount = toBaseUnits(tokenAmountText, tokenDecimals, "LIQUIDITY_TOKEN_AMOUNT");
  const quoteAmount = toBaseUnits(quoteAmountText, quoteDecimals, "LIQUIDITY_QUOTE_AMOUNT");
  const tokenMinimum = minimumAmount(tokenAmount, slippageBps);
  const quoteMinimum = minimumAmount(quoteAmount, slippageBps);

  const [tokenBalance, quoteBalance, nativeBalance, feeData] = await Promise.all([
    token.balanceOf(signer.address),
    quote.balanceOf(signer.address),
    ethers.provider.getBalance(signer.address),
    ethers.provider.getFeeData(),
  ]);
  const feePerGas = feeData.gasPrice ?? feeData.maxFeePerGas;
  if (feePerGas === null) {
    throw new Error("The RPC did not return a gas price.");
  }
  const minimumNative = 800_000n * feePerGas;

  console.log(`Signer: ${signer.address}`);
  console.log(`Token: ${tokenSymbol} ${tokenAddress}`);
  console.log(`Deposit: ${ethers.formatUnits(tokenAmount, tokenDecimals)} ${tokenSymbol}`);
  console.log(`Quote: ${quoteSymbol} ${quoteAddress}`);
  if (quoteAddress === BTCB) {
    console.log("The quote asset is Binance-Peg BTCB. This spends BTCB, not native Bitcoin.");
  } else {
    console.log("QUOTE_TOKEN is set, so this deposit does not use the default BTCB contract.");
  }
  console.log(`Deposit: ${ethers.formatUnits(quoteAmount, quoteDecimals)} ${quoteSymbol}`);
  console.log(
    `The ratio of these two amounts is the opening price when the pair is empty. This command does not choose a price for you.`,
  );
  console.log(`Slippage: ${slippageBps.toString()} basis points.`);
  console.log(`Minimum ${tokenSymbol}: ${ethers.formatUnits(tokenMinimum, tokenDecimals)}`);
  console.log(`Minimum ${quoteSymbol}: ${ethers.formatUnits(quoteMinimum, quoteDecimals)}`);
  console.log(`Predicted PancakeSwap V2 pair: ${pairAddress}`);
  console.log(`Router: ${PANCAKE_V2_ROUTER}`);
  console.log("LP tokens will be sent to the signer. This command does not lock or burn them.");
  console.log(`${tokenSymbol} balance: ${ethers.formatUnits(tokenBalance, tokenDecimals)}`);
  console.log(`${quoteSymbol} balance: ${ethers.formatUnits(quoteBalance, quoteDecimals)}`);
  console.log(`BNB balance: ${ethers.formatEther(nativeBalance)}`);
  console.log(
    `Gas reserve: about ${ethers.formatEther(minimumNative)} BNB for the approvals and the supply transaction.`,
  );

  if (tokenBalance < tokenAmount) {
    throw new Error(`Signer ${tokenSymbol} balance is below the deposit. No transaction was sent.`);
  }
  if (quoteBalance < quoteAmount) {
    throw new Error(`Signer ${quoteSymbol} balance is below the deposit. No transaction was sent.`);
  }
  if (nativeBalance < minimumNative) {
    throw new Error(
      `Signer BNB balance ${ethers.formatEther(nativeBalance)} is below the gas reserve ${ethers.formatEther(minimumNative)}. No transaction was sent.`,
    );
  }

  console.log("Review the amounts above. The next step spends both assets.");
  await confirmPhrase("ADD");

  await ensureAllowance(tokenAddress, signer.address, PANCAKE_V2_ROUTER, tokenAmount, tokenSymbol, signer);
  await ensureAllowance(quoteAddress, signer.address, PANCAKE_V2_ROUTER, quoteAmount, quoteSymbol, signer);

  const receipt = await send(
    router.addLiquidity(
      tokenAddress,
      quoteAddress,
      tokenAmount,
      quoteAmount,
      tokenMinimum,
      quoteMinimum,
      signer.address,
      actionDeadline(LIQUIDITY_DEADLINE_SECONDS),
    ),
    "Liquidity transaction",
  );

  const pair = pairContract(pairAddress, signer);
  const [token0, reserves, lpBalance] = await Promise.all([
    pair.token0(),
    pair.getReserves(),
    pair.balanceOf(signer.address),
  ]);
  const tokenReserve = token0 === tokenAddress ? reserves[0] : reserves[1];
  const quoteReserve = token0 === tokenAddress ? reserves[1] : reserves[0];
  console.log(`Pair: ${pairAddress}`);
  console.log(`Reserves: ${ethers.formatUnits(tokenReserve, tokenDecimals)} ${tokenSymbol} and ${ethers.formatUnits(quoteReserve, quoteDecimals)} ${quoteSymbol}`);
  console.log(`LP token balance of signer: ${lpBalance.toString()} base units`);
  console.log("One swap against this pair is still required before most price feeds, including Trust Wallet, show a chart.");

  const recordPath = appendLiquidityRecord(definition.name, {
    network: definition.name,
    chainId: definition.chainId,
    token: tokenAddress,
    quoteToken: quoteAddress,
    pair: pairAddress,
    tokenAmount: tokenAmountText,
    quoteAmount: quoteAmountText,
    tokenAmountRaw: tokenAmount.toString(),
    quoteAmountRaw: quoteAmount.toString(),
    slippageBps,
    signer: signer.address,
    router: PANCAKE_V2_ROUTER,
    liquidityTransaction: receipt.hash,
    addedAt: new Date().toISOString(),
  });
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, {
    Token: tokenAddress,
    Quote: quoteAddress,
    Pair: pairAddress,
  });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
