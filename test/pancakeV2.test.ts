import { expect } from "chai";

import {
  BTCB,
  MAX_SLIPPAGE_BPS,
  assertPairNotConstrained,
  assertTransferAllowed,
  minimumAmount,
  pancakeV2PairAddress,
  parseLpAmount,
  parsePositiveAmount,
  parseSlippageBps,
  proRataAmount,
  quoteTokenAddress,
  resolveSwapQuoteAmount,
  selectSwapAmounts,
  swapPath,
  toBaseUnits,
} from "../scripts/lib/pancakeV2";
import { resolveProxyAddress } from "../scripts/lib/tx";

const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BTCB_WBNB_PAIR = "0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082";

describe("PancakeSwap V2 liquidity helpers", () => {
  it("derives the live BTCB/WBNB pair address in either token order", () => {
    expect(pancakeV2PairAddress(BTCB, WBNB)).to.equal(BTCB_WBNB_PAIR);
    expect(pancakeV2PairAddress(WBNB, BTCB)).to.equal(BTCB_WBNB_PAIR);
  });

  it("rejects a pair of one token with itself", () => {
    expect(() => pancakeV2PairAddress(BTCB, BTCB)).to.throw("The two liquidity tokens must be different contracts.");
  });

  it("defaults the quote asset to BTCB and accepts an explicit override", () => {
    expect(quoteTokenAddress(undefined)).to.equal(BTCB);
    expect(quoteTokenAddress("")).to.equal(BTCB);
    expect(quoteTokenAddress(WBNB.toLowerCase())).to.equal(WBNB);
  });

  it("parses a positive amount and a slippage default", () => {
    expect(parsePositiveAmount("0.001", "LIQUIDITY_QUOTE_AMOUNT")).to.equal("0.001");
    expect(parseSlippageBps(undefined)).to.equal(100);
    expect(toBaseUnits("1.5", 18n, "LIQUIDITY_TOKEN_AMOUNT")).to.equal(1_500_000_000_000_000_000n);
  });

  it("rejects an empty, zero, or non-decimal amount", () => {
    expect(() => parsePositiveAmount(undefined, "LIQUIDITY_TOKEN_AMOUNT")).to.throw(
      "LIQUIDITY_TOKEN_AMOUNT is required.",
    );
    expect(() => parsePositiveAmount("0", "LIQUIDITY_TOKEN_AMOUNT")).to.throw(
      "LIQUIDITY_TOKEN_AMOUNT must be greater than zero.",
    );
    expect(() => toBaseUnits("0", 18n, "LIQUIDITY_TOKEN_AMOUNT")).to.throw(
      "LIQUIDITY_TOKEN_AMOUNT must be greater than zero.",
    );
    expect(() => parsePositiveAmount("1e2", "LIQUIDITY_TOKEN_AMOUNT")).to.throw(
      "LIQUIDITY_TOKEN_AMOUNT must be a positive decimal amount.",
    );
  });

  it("selects one swap side and builds the path", () => {
    const token = "0x0000000000000000000000000000000000000006";
    expect(selectSwapAmounts("0.001", undefined).direction).to.equal("quoteForToken");
    expect(selectSwapAmounts(undefined, "10").direction).to.equal("tokenForQuote");
    expect(swapPath("quoteForToken", token, BTCB)).to.deep.equal([BTCB, token]);
    expect(swapPath("tokenForQuote", token, BTCB)).to.deep.equal([token, BTCB]);
    expect(() => selectSwapAmounts("1", "1")).to.throw("Set exactly one of SWAP_QUOTE_AMOUNT or SWAP_TOKEN_AMOUNT.");
    expect(() => selectSwapAmounts(undefined, undefined)).to.throw(
      "Set exactly one of SWAP_QUOTE_AMOUNT or SWAP_TOKEN_AMOUNT.",
    );
  });

  it("treats an empty SWAP_QUOTE_AMOUNT as unset so SWAP_BTCB_AMOUNT applies", () => {
    expect(resolveSwapQuoteAmount("", "0.0001")).to.equal("0.0001");
    expect(resolveSwapQuoteAmount(undefined, "0.0001")).to.equal("0.0001");
    expect(resolveSwapQuoteAmount("0.5", "")).to.equal("0.5");
    expect(resolveSwapQuoteAmount("0.5", "0.5")).to.equal("0.5");
    expect(resolveSwapQuoteAmount("", " ")).to.equal(undefined);
    expect(() => resolveSwapQuoteAmount("0.5", "0.1")).to.throw("both set to different amounts");
  });

  it("withdraws a share of the pool and reads the LP amount", () => {
    expect(proRataAmount(25n, 100n, 100n)).to.equal(25n);
    expect(() => proRataAmount(101n, 1n, 100n)).to.throw("LP amount exceeds the pair supply.");
    expect(parseLpAmount(undefined)).to.equal("max");
    expect(parseLpAmount("MAX")).to.equal("max");
    expect(parseLpAmount("1.5")).to.equal("1.5");
  });

  it("blocks constrained pool transfers and rejects the implementation address", () => {
    const proxy = "0x0000000000000000000000000000000000000001";
    const implementation = "0x0000000000000000000000000000000000000002";
    const v2 = "0x0000000000000000000000000000000000000003";
    const v3 = "0x0000000000000000000000000000000000000004";
    const wallet = "0x0000000000000000000000000000000000000005";
    expect(() => assertPairNotConstrained(true, v2, v2, v3)).to.throw("configured pool");
    expect(() => assertPairNotConstrained(false, v2, v2, v3)).not.to.throw();
    expect(() => assertTransferAllowed(true, wallet, v3, v2, v3)).to.throw("constraints are still on");
    expect(() => assertTransferAllowed(true, wallet, proxy, v2, v3)).not.to.throw();
    expect(resolveProxyAddress({ proxy, implementation }, undefined)).to.equal(proxy);
    expect(() => resolveProxyAddress({ proxy, implementation }, implementation)).to.throw(
      "TOKEN_ADDRESS is the implementation.",
    );
  });

  it("applies slippage and refuses a zero minimum", () => {
    expect(minimumAmount(10_000n, 100)).to.equal(9_900n);
    expect(minimumAmount(10_000n, 0)).to.equal(10_000n);
    expect(() => minimumAmount(1n, MAX_SLIPPAGE_BPS)).to.throw("Slippage rounds the minimum deposit to zero.");
    expect(() => parseSlippageBps("1001")).to.throw("LIQUIDITY_SLIPPAGE_BPS must be from 0 to 1000.");
  });
});
