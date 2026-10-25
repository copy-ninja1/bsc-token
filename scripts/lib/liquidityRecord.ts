import fs from "node:fs";
import path from "node:path";

export interface LiquidityRecord {
  network: string;
  chainId: number;
  token: string;
  quoteToken: string;
  pair: string;
  tokenAmount: string;
  quoteAmount: string;
  tokenAmountRaw: string;
  quoteAmountRaw: string;
  slippageBps: number;
  signer: string;
  router: string;
  liquidityTransaction: string;
  addedAt: string;
}

export function appendLiquidityRecord(networkName: string, entry: LiquidityRecord): string {
  const filePath = path.join("deployments", `${networkName}.liquidity.json`);
  const existing = readEntries(filePath);
  existing.push(entry);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(existing, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
  return filePath;
}

function readEntries(filePath: string): LiquidityRecord[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const value: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(value)) {
    throw new Error(`Liquidity record at ${filePath} is not a list. Refusing to overwrite it.`);
  }
  return value as LiquidityRecord[];
}
