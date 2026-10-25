import fs from "node:fs";
import path from "node:path";

export type MainnetAction =
  | "swap"
  | "removeLiquidity"
  | "transfer"
  | "transferOwnership"
  | "renounceOwnership"
  | "upgrade"
  | "revokeApproval"
  | "lockLiquidity"
  | "burn"
  | "pause"
  | "unpause";

export interface ActionRecord {
  action: MainnetAction;
  network: string;
  chainId: number;
  token: string;
  signer: string;
  transaction: string;
  detail: string;
  at: string;
}

export function appendActionRecord(networkName: string, entry: ActionRecord): string {
  const filePath = path.join("deployments", `${networkName}.actions.json`);
  const existing = readEntries(filePath);
  existing.push(entry);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(existing, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
  return filePath;
}

function readEntries(filePath: string): ActionRecord[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const value: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(value)) {
    throw new Error(`Action record at ${filePath} is not a list. Refusing to overwrite it.`);
  }
  return value as ActionRecord[];
}
