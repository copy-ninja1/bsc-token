/**
 * Compiler settings taken from the supplied reference compiler JSON:
 * optimizer enabled, 99999 runs, London EVM, viaIR off.
 * The reference pragma was ^0.8.13 and did not name a patch release.
 * 0.8.19 is pinned because it satisfies that pragma and targets London
 * without the Shanghai PUSH0 opcode.
 */
export const SOLIDITY_VERSION = "0.8.19";
export const OPTIMIZER_ENABLED = true;
export const OPTIMIZER_RUNS = 99999;
export const EVM_VERSION = "london" as const;
export const VIA_IR = false;

export const OPENZEPPELIN_VERSION = "4.9.6";
