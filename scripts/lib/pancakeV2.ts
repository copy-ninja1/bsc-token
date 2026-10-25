import { ethers, type BaseContract, type ContractTransactionResponse } from "ethers";

/** PancakeSwap V2 on BNB Smart Chain mainnet. */
export const PANCAKE_V2_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
export const PANCAKE_V2_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
/** PancakeSwap V2 pair init-code hash. Pair addresses derived with it match factory.getPair. */
export const PANCAKE_V2_INIT_CODE_HASH =
  "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5";
/** Official Binance-Peg BTCB on BNB Smart Chain. This is not native Bitcoin. */
export const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";

export const DEFAULT_SLIPPAGE_BPS = 100;
export const MAX_SLIPPAGE_BPS = 1_000;
export const LIQUIDITY_DEADLINE_SECONDS = 20 * 60;

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

const ROUTER_ABI = [
  "function factory() view returns (address)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)",
];

const PAIR_ABI = [
  "function token0() view returns (address)",
  "function factory() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export interface Erc20 {
  decimals(): Promise<bigint>;
  symbol(): Promise<string>;
  balanceOf(account: string): Promise<bigint>;
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(spender: string, amount: bigint): Promise<ContractTransactionResponse>;
}

export interface PancakeV2Router {
  factory(): Promise<string>;
  addLiquidity(
    tokenA: string,
    tokenB: string,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    deadline: bigint,
  ): Promise<ContractTransactionResponse>;
  removeLiquidity(
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    deadline: bigint,
  ): Promise<ContractTransactionResponse>;
  swapExactTokensForTokens(
    amountIn: bigint,
    amountOutMin: bigint,
    path: readonly string[],
    to: string,
    deadline: bigint,
  ): Promise<ContractTransactionResponse>;
  getAmountsOut(amountIn: bigint, path: readonly string[]): Promise<bigint[]>;
}

export interface PancakeV2Pair {
  token0(): Promise<string>;
  factory(): Promise<string>;
  getReserves(): Promise<[bigint, bigint, number]>;
  balanceOf(account: string): Promise<bigint>;
  totalSupply(): Promise<bigint>;
  decimals(): Promise<bigint>;
}

export type SwapDirection = "quoteForToken" | "tokenForQuote";

export interface SwapSelection {
  direction: SwapDirection;
  amountText: string;
  amountName: string;
}

export function asErc20(contract: BaseContract): Erc20 {
  return contract as unknown as Erc20;
}

export function asRouter(contract: BaseContract): PancakeV2Router {
  return contract as unknown as PancakeV2Router;
}

export function asPair(contract: BaseContract): PancakeV2Pair {
  return contract as unknown as PancakeV2Pair;
}

export function erc20Contract(address: string, runner: ethers.ContractRunner): Erc20 {
  return asErc20(new ethers.Contract(address, ERC20_ABI, runner));
}

export function routerContract(runner: ethers.ContractRunner): PancakeV2Router {
  return asRouter(new ethers.Contract(PANCAKE_V2_ROUTER, ROUTER_ABI, runner));
}

export function pairContract(address: string, runner: ethers.ContractRunner): PancakeV2Pair {
  return asPair(new ethers.Contract(address, PAIR_ABI, runner));
}

/**
 * PancakeSwap V2 pair address for two tokens. Order does not matter.
 * The result is the address the factory will create, including before the pair exists.
 */
export function pancakeV2PairAddress(tokenA: string, tokenB: string): string {
  const left = ethers.getAddress(tokenA);
  const right = ethers.getAddress(tokenB);
  if (left === right) {
    throw new Error("The two liquidity tokens must be different contracts.");
  }
  const [token0, token1] = left.toLowerCase() < right.toLowerCase() ? [left, right] : [right, left];
  return ethers.getCreate2Address(
    PANCAKE_V2_FACTORY,
    ethers.keccak256(ethers.solidityPacked(["address", "address"], [token0, token1])),
    PANCAKE_V2_INIT_CODE_HASH,
  );
}

export function parseSlippageBps(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return DEFAULT_SLIPPAGE_BPS;
  }
  if (!/^\d+$/.test(value.trim())) {
    throw new Error("LIQUIDITY_SLIPPAGE_BPS must be a whole number of basis points.");
  }
  const parsed = Number(value.trim());
  if (parsed > MAX_SLIPPAGE_BPS) {
    throw new Error(`LIQUIDITY_SLIPPAGE_BPS must be from 0 to ${MAX_SLIPPAGE_BPS.toString()}.`);
  }
  return parsed;
}

export function parsePositiveAmount(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`${name} must be a positive decimal amount.`);
  }
  if (/^0+(\.0+)?$/.test(trimmed)) {
    throw new Error(`${name} must be greater than zero.`);
  }
  return trimmed;
}

export function toBaseUnits(amount: string, decimals: bigint, name: string): bigint {
  try {
    const parsed = ethers.parseUnits(amount, decimals);
    if (parsed <= 0n) {
      throw new Error(`${name} must be greater than zero.`);
    }
    return parsed;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === `${name} must be greater than zero.`) {
      throw error;
    }
    throw new Error(`${name} is not a valid ${decimals.toString()}-decimal amount.`);
  }
}

/** Minimum amount the router may pull. Rejects a result of zero so a deposit cannot be sandwiched to nothing. */
export function minimumAmount(desired: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > MAX_SLIPPAGE_BPS) {
    throw new Error(`Slippage must be from 0 to ${MAX_SLIPPAGE_BPS.toString()} basis points.`);
  }
  if (desired <= 0n) {
    throw new Error("Liquidity amount must be greater than zero.");
  }
  const minimum = (desired * BigInt(10_000 - slippageBps)) / 10_000n;
  if (minimum <= 0n) {
    throw new Error(
      "Slippage rounds the minimum deposit to zero. Lower LIQUIDITY_SLIPPAGE_BPS or raise the amount.",
    );
  }
  return minimum;
}

export function quoteTokenAddress(configured: string | undefined): string {
  const trimmed = configured?.trim() ?? "";
  if (trimmed.length === 0) {
    return BTCB;
  }
  return ethers.getAddress(trimmed);
}

/** SWAP_BTCB_AMOUNT is an alias for SWAP_QUOTE_AMOUNT. An empty value counts as unset, as dotenv writes it. */
export function resolveSwapQuoteAmount(quoteAmount: string | undefined, btcbAmount: string | undefined): string | undefined {
  const quote = quoteAmount?.trim() ?? "";
  const btcb = btcbAmount?.trim() ?? "";
  if (quote.length > 0 && btcb.length > 0 && quote !== btcb) {
    throw new Error("SWAP_QUOTE_AMOUNT and SWAP_BTCB_AMOUNT are both set to different amounts.");
  }
  if (quote.length > 0) {
    return quote;
  }
  return btcb.length > 0 ? btcb : undefined;
}

export function selectSwapAmounts(quoteAmount: string | undefined, tokenAmount: string | undefined): SwapSelection {
  const quote = quoteAmount?.trim() ?? "";
  const token = tokenAmount?.trim() ?? "";
  if ((quote.length === 0) === (token.length === 0)) {
    throw new Error("Set exactly one of SWAP_QUOTE_AMOUNT or SWAP_TOKEN_AMOUNT.");
  }
  if (quote.length > 0) {
    return {
      direction: "quoteForToken",
      amountText: parsePositiveAmount(quote, "SWAP_QUOTE_AMOUNT"),
      amountName: "SWAP_QUOTE_AMOUNT",
    };
  }
  return {
    direction: "tokenForQuote",
    amountText: parsePositiveAmount(token, "SWAP_TOKEN_AMOUNT"),
    amountName: "SWAP_TOKEN_AMOUNT",
  };
}

export function swapPath(direction: SwapDirection, token: string, quote: string): [string, string] {
  const tokenAddress = ethers.getAddress(token);
  const quoteAddress = ethers.getAddress(quote);
  if (tokenAddress === quoteAddress) {
    throw new Error("The two swap tokens must be different contracts.");
  }
  return direction === "quoteForToken"
    ? [quoteAddress, tokenAddress]
    : [tokenAddress, quoteAddress];
}

/** LP tokens withdrawn, as a share of one reserve. Matches the PancakeSwap pair formula. */
export function proRataAmount(liquidity: bigint, reserve: bigint, totalSupply: bigint): bigint {
  if (totalSupply <= 0n) {
    throw new Error("The pair has no LP supply.");
  }
  if (liquidity <= 0n) {
    throw new Error("Liquidity amount must be greater than zero.");
  }
  if (liquidity > totalSupply) {
    throw new Error("LP amount exceeds the pair supply.");
  }
  return (liquidity * reserve) / totalSupply;
}

/** Empty or "max" withdraws the signer's full LP balance. */
export function parseLpAmount(value: string | undefined): "max" | string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0 || trimmed.toLowerCase() === "max") {
    return "max";
  }
  return parsePositiveAmount(trimmed, "LIQUIDITY_LP_AMOUNT");
}

export function assertPairNotConstrained(constraints: boolean, pair: string, v2: string, v3: string): void {
  if (constraints && (pair === v2 || pair === v3)) {
    throw new Error(
      `The PancakeSwap pair ${pair} is one of the configured pool addresses. Transfers to it revert while constraints are on. Remove constraints first. No transaction was sent.`,
    );
  }
}

export function assertTransferAllowed(
  constraints: boolean,
  from: string,
  to: string,
  v2: string,
  v3: string,
): void {
  if (!constraints) {
    return;
  }
  if (from === v2 || to === v2 || from === v3 || to === v3) {
    throw new Error(
      "This transfer touches a configured pool address and constraints are still on. No transaction was sent.",
    );
  }
}
