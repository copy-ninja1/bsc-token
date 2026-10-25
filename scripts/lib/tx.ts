import type { ContractRunner, ContractTransactionReceipt, ContractTransactionResponse, Signer } from "ethers";
import { ethers } from "hardhat";

import type { NetworkDefinition } from "../../config/networks";
import { asTokenV2, type TokenV2 } from "../../types/tokenV2";
import type { DeploymentRecord } from "./record";
import { readDeploymentRecord } from "./record";
import { erc20Contract } from "./pancakeV2";
import { assertConnectedNetwork } from "./safety";

export async function requireSigner(): Promise<Awaited<ReturnType<typeof ethers.getSigners>>[number]> {
  const [signer] = await ethers.getSigners();
  if (signer === undefined) {
    throw new Error("No signer is configured. Set PRIVATE_KEY.");
  }
  return signer;
}

export function resolveProxyAddress(
  record: Pick<DeploymentRecord, "proxy" | "implementation">,
  configured: string | undefined,
): string {
  const trimmed = configured?.trim() ?? "";
  const tokenAddress = ethers.getAddress(trimmed.length > 0 ? trimmed : record.proxy);
  if (tokenAddress === ethers.getAddress(record.implementation)) {
    throw new Error("TOKEN_ADDRESS is the implementation. Use the proxy.");
  }
  return tokenAddress;
}

export async function send(
  pending: Promise<ContractTransactionResponse>,
  label: string,
): Promise<ContractTransactionReceipt> {
  const tx = await pending;
  console.log(`${label}: ${tx.hash}`);
  const receipt = await tx.wait();
  if (receipt === null || receipt.status !== 1) {
    throw new Error(`${label} failed.`);
  }
  return receipt;
}

export async function ensureAllowance(
  tokenAddress: string,
  owner: string,
  spender: string,
  amount: bigint,
  label: string,
  runner: ContractRunner,
): Promise<void> {
  const token = erc20Contract(tokenAddress, runner);
  const current = await token.allowance(owner, spender);
  if (current >= amount) {
    console.log(`${label} allowance already covers this amount.`);
    return;
  }
  if (current > 0n) {
    console.log(`Resetting the existing ${label} allowance before the new approval.`);
    await send(token.approve(spender, 0n), `${label} allowance reset`);
  }
  await send(token.approve(spender, amount), `${label} approval`);
  const updated = await token.allowance(owner, spender);
  if (updated < amount) {
    throw new Error(`${label} approval did not reach the required allowance.`);
  }
}

export async function assertGasBalance(account: string, gasUnits: bigint): Promise<void> {
  const [balance, feeData] = await Promise.all([
    ethers.provider.getBalance(account),
    ethers.provider.getFeeData(),
  ]);
  const feePerGas = feeData.gasPrice ?? feeData.maxFeePerGas;
  if (feePerGas === null) {
    throw new Error("The RPC did not return a gas price.");
  }
  const minimum = gasUnits * feePerGas;
  console.log(`BNB balance: ${ethers.formatEther(balance)}`);
  console.log(`Gas reserve: about ${ethers.formatEther(minimum)} BNB.`);
  if (balance < minimum) {
    throw new Error(
      `Signer BNB balance ${ethers.formatEther(balance)} is below the gas reserve ${ethers.formatEther(minimum)}. No transaction was sent.`,
    );
  }
}

export function actionDeadline(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

export function printTransaction(definition: NetworkDefinition, hash: string): void {
  if (definition.explorer === undefined) {
    console.log(`Transaction: ${hash}`);
    return;
  }
  console.log(`Transaction: ${definition.explorer}/tx/${hash}`);
}

export async function loadDeployedToken(runner?: Signer): Promise<{
  definition: NetworkDefinition;
  tokenAddress: string;
  token: TokenV2;
}> {
  const definition = await assertConnectedNetwork();
  if (definition.kind !== "mainnet") {
    throw new Error("This command runs on BNB Smart Chain mainnet only.");
  }
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);
  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, runner));
  return { definition, tokenAddress, token };
}
