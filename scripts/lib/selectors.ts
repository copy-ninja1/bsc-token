import { ethers } from "ethers";

/** True when the runtime bytecode contains the 4-byte selector for `signature`. */
export function bytecodeHasSelector(code: string, signature: string): boolean {
  const body = code.toLowerCase().replace(/^0x/, "");
  if (body.length === 0 || body === "0") {
    return false;
  }
  const selector = ethers.id(signature).slice(2, 10).toLowerCase();
  return body.includes(selector);
}

export const BURN_SIGNATURE = "burn(uint256)";
export const BURN_FROM_SIGNATURE = "burnFrom(address,uint256)";
export const PAUSE_SIGNATURE = "pause()";
export const UNPAUSE_SIGNATURE = "unpause()";
export const PAUSED_SIGNATURE = "paused()";
