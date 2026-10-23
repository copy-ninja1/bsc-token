import fs from "node:fs";
import path from "node:path";

import {
  EVM_VERSION,
  OPENZEPPELIN_VERSION,
  OPTIMIZER_ENABLED,
  OPTIMIZER_RUNS,
  SOLIDITY_VERSION,
  VIA_IR,
} from "../../config/compiler";
import type { ResolvedTokenConfig } from "../../config/token.config";

export interface DeploymentRecord {
  network: string;
  chainId: number;
  tokenName: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  rawInitialSupply: string;
  metadataURI: string;
  v2PoolAddress: string;
  v3PoolAddress: string;
  initialOwner: string;
  initialSupplyRecipient: string;
  deployer: string;
  implementation: string;
  proxy: string;
  proxyAdmin: string;
  implementationTransaction: string;
  proxyAdminTransaction: string;
  proxyTransaction: string;
  initializeData: string;
  transferConstraintsEnabled: boolean;
  compilerVersion: string;
  optimizerEnabled: boolean;
  optimizerRuns: number;
  evmVersion: string;
  viaIR: boolean;
  openZeppelinContracts: string;
  usingLocalDefaults: boolean;
  deployedAt: string;
}

export interface ImplementationRecord {
  network: string;
  chainId: number;
  implementation: string;
  transaction: string;
  compilerVersion: string;
  optimizerRuns: number;
  evmVersion: string;
  deployedAt: string;
}

function deploymentPath(networkName: string): string {
  return path.join("deployments", `${networkName}.json`);
}

function implementationPath(networkName: string): string {
  return path.join("deployments", `${networkName}.implementation.json`);
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function assertNoExistingDeployment(networkName: string): void {
  const filePath = deploymentPath(networkName);
  if (fs.existsSync(filePath) && process.env.ALLOW_REDEPLOY !== "true") {
    throw new Error(
      `A deployment record already exists at ${filePath}. Set ALLOW_REDEPLOY=true to write another one.`,
    );
  }
}

export function writeDeploymentRecord(
  config: ResolvedTokenConfig,
  chainId: number,
  deployment: Omit<
    DeploymentRecord,
    | "network"
    | "chainId"
    | "tokenName"
    | "symbol"
    | "decimals"
    | "initialSupply"
    | "rawInitialSupply"
    | "metadataURI"
    | "v2PoolAddress"
    | "v3PoolAddress"
    | "initialOwner"
    | "initialSupplyRecipient"
    | "deployer"
    | "compilerVersion"
    | "optimizerEnabled"
    | "optimizerRuns"
    | "evmVersion"
    | "viaIR"
    | "openZeppelinContracts"
    | "usingLocalDefaults"
    | "deployedAt"
  >,
): string {
  const record: DeploymentRecord = {
    network: config.networkName,
    chainId,
    tokenName: config.name,
    symbol: config.symbol,
    decimals: config.decimals,
    initialSupply: config.initialSupply,
    rawInitialSupply: config.rawInitialSupply.toString(),
    metadataURI: config.metadataURI,
    v2PoolAddress: config.v2PoolAddress,
    v3PoolAddress: config.v3PoolAddress,
    initialOwner: config.initialOwner,
    initialSupplyRecipient: config.initialSupplyRecipient,
    deployer: config.deployer,
    implementation: deployment.implementation,
    proxy: deployment.proxy,
    proxyAdmin: deployment.proxyAdmin,
    implementationTransaction: deployment.implementationTransaction,
    proxyAdminTransaction: deployment.proxyAdminTransaction,
    proxyTransaction: deployment.proxyTransaction,
    initializeData: deployment.initializeData,
    transferConstraintsEnabled: deployment.transferConstraintsEnabled,
    compilerVersion: SOLIDITY_VERSION,
    optimizerEnabled: OPTIMIZER_ENABLED,
    optimizerRuns: OPTIMIZER_RUNS,
    evmVersion: EVM_VERSION,
    viaIR: VIA_IR,
    openZeppelinContracts: OPENZEPPELIN_VERSION,
    usingLocalDefaults: config.usingLocalDefaults,
    deployedAt: new Date().toISOString(),
  };
  return writeJson(deploymentPath(config.networkName), record);
}

export function readDeploymentRecord(networkName: string): DeploymentRecord {
  const filePath = deploymentPath(networkName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No deployment record at ${filePath}.`);
  }
  const value = readJson(filePath);
  if (!isDeploymentRecord(value)) {
    throw new Error(`Deployment record at ${filePath} is missing required fields.`);
  }
  return value;
}

export function writeImplementationRecord(record: ImplementationRecord): string {
  return writeJson(implementationPath(record.network), record);
}

export function readImplementationRecord(networkName: string): ImplementationRecord {
  const filePath = implementationPath(networkName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No implementation record at ${filePath}.`);
  }
  const value = readJson(filePath);
  if (typeof value !== "object" || value === null) {
    throw new Error(`Implementation record at ${filePath} is not an object.`);
  }
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.implementation) || !isNonEmptyString(record.transaction)) {
    throw new Error(`Implementation record at ${filePath} is missing required fields.`);
  }
  return {
    network: networkName,
    chainId: typeof record.chainId === "number" ? record.chainId : 0,
    implementation: record.implementation,
    transaction: record.transaction,
    compilerVersion: isNonEmptyString(record.compilerVersion) ? record.compilerVersion : "",
    optimizerRuns: typeof record.optimizerRuns === "number" ? record.optimizerRuns : 0,
    evmVersion: isNonEmptyString(record.evmVersion) ? record.evmVersion : "",
    deployedAt: isNonEmptyString(record.deployedAt) ? record.deployedAt : "",
  };
}

function writeJson(filePath: string, value: DeploymentRecord | ImplementationRecord): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
  return filePath;
}

function isDeploymentRecord(value: unknown): value is DeploymentRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.proxy) &&
    isNonEmptyString(record.implementation) &&
    isNonEmptyString(record.proxyAdmin) &&
    isNonEmptyString(record.initializeData) &&
    isNonEmptyString(record.implementationTransaction) &&
    isNonEmptyString(record.proxyAdminTransaction) &&
    isNonEmptyString(record.proxyTransaction) &&
    typeof record.chainId === "number"
  );
}
