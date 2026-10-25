import fs from "node:fs";

import type { ContractTransactionResponse } from "ethers";
import { artifacts, ethers, upgrades } from "hardhat";

import { asTokenV2 } from "../types/tokenV2";
import { appendActionRecord } from "./lib/actionRecord";
import { failureMessage } from "./lib/errors";
import { assertMainnetAction, confirmPhrase } from "./lib/prompt";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";
import { assertGasBalance, printTransaction, requireSigner, resolveProxyAddress } from "./lib/tx";

const ADMIN_ABI = ["function owner() view returns (address)"];

interface AdminOwner {
  owner(): Promise<string>;
}

interface UpgradeResult {
  deploymentTransaction?: () => ContractTransactionResponse | null;
  deployTransaction?: ContractTransactionResponse | null;
}

/** Drops the Solidity CBOR metadata suffix so a recompile can still match the deployed runtime code. */
function runtimeBody(code: string): string {
  const normalized = code.toLowerCase().replace(/^0x/, "");
  if (normalized.length < 4) {
    return normalized;
  }
  const metadataBytes = Number.parseInt(normalized.slice(-4), 16);
  const payload = metadataBytes * 2;
  if (!Number.isInteger(metadataBytes) || payload <= 0 || payload + 4 >= normalized.length) {
    return normalized;
  }
  return normalized.slice(0, -(payload + 4));
}

function manifestContains(implementation: string): boolean {
  const needle = implementation.toLowerCase();
  for (const filePath of [".openzeppelin/bsc.json", ".openzeppelin/unknown-56.json"]) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    if (fs.readFileSync(filePath, "utf8").toLowerCase().includes(needle)) {
      return true;
    }
  }
  return false;
}

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  assertMainnetAction(
    definition.kind,
    "CONFIRM_UPGRADE",
    "This points the proxy at a new TokenV2 implementation.",
  );

  const signer = await requireSigner();
  const record = readDeploymentRecord(definition.name);
  const tokenAddress = resolveProxyAddress(record, process.env.TOKEN_ADDRESS);
  const [currentImplementation, adminAddress] = await Promise.all([
    upgrades.erc1967.getImplementationAddress(tokenAddress),
    upgrades.erc1967.getAdminAddress(tokenAddress),
  ]);
  const admin = new ethers.Contract(adminAddress, ADMIN_ABI, signer) as unknown as AdminOwner;
  const adminOwner = ethers.getAddress(await admin.owner());
  if (adminOwner !== signer.address) {
    throw new Error(
      `Signer ${signer.address} is not the proxy admin owner ${adminOwner}. No transaction was sent.`,
    );
  }

  const factory = await ethers.getContractFactory("TokenV2", signer);
  const artifact = await artifacts.readArtifact("TokenV2");
  const onchain = runtimeBody(await ethers.provider.getCode(currentImplementation));
  const compiled = runtimeBody(artifact.deployedBytecode);
  if (compiled.length <= 2) {
    throw new Error("TokenV2 has no compiled runtime bytecode. Run npm run compile.");
  }

  const token = asTokenV2(await ethers.getContractAt("TokenV2", tokenAddress, signer));
  const [name, symbol, supply, owner] = await Promise.all([
    token.name(),
    token.symbol(),
    token.totalSupply(),
    token.owner(),
  ]);
  console.log(`Proxy: ${tokenAddress}`);
  console.log(`Proxy admin: ${adminAddress}`);
  console.log(`Current implementation: ${currentImplementation}`);
  console.log(`Token: ${name} (${symbol}), supply ${supply.toString()}, owner ${owner}`);
  console.log("An upgrade keeps balances, allowances, and ownership on the proxy.");

  if (onchain === compiled) {
    await upgrades.forceImport(tokenAddress, factory, { kind: "transparent" });
    console.log("The live implementation matches this source. Its layout is recorded in .openzeppelin/.");
    console.log("No upgrade transaction was sent. Edit TokenV2, recompile, and run this command again to upgrade.");
    return;
  }

  if (!manifestContains(currentImplementation)) {
    throw new Error(
      "The compiled TokenV2 does not match the live implementation, and its layout was never recorded. Run this command once while the source still matches the chain, then edit TokenV2 and run it again. No transaction was sent.",
    );
  }

  const deployment = await factory.getDeployTransaction();
  if (deployment.data === undefined) {
    throw new Error("Implementation deployment transaction has no data.");
  }
  const gas = await ethers.provider.estimateGas({ data: deployment.data, from: signer.address });
  await assertGasBalance(signer.address, gas * 3n);
  console.log("Review the upgrade above. The next step deploys the compiled TokenV2 and points the proxy at it.");
  await confirmPhrase("UPGRADE");

  const upgraded = (await upgrades.upgradeProxy(tokenAddress, factory, {
    kind: "transparent",
  })) as unknown as UpgradeResult;
  const upgradeTransaction = upgraded.deploymentTransaction?.() ?? upgraded.deployTransaction ?? null;
  if (upgradeTransaction === null) {
    throw new Error("The upgrade did not return a transaction.");
  }
  const receipt = await upgradeTransaction.wait();
  if (receipt === null || receipt.status !== 1) {
    throw new Error("The upgrade transaction failed.");
  }
  const nextImplementation = await upgrades.erc1967.getImplementationAddress(tokenAddress);
  if (nextImplementation === currentImplementation) {
    throw new Error("The proxy implementation address did not change.");
  }
  const [nextName, nextSymbol, nextSupply, nextOwner] = await Promise.all([
    token.name(),
    token.symbol(),
    token.totalSupply(),
    token.owner(),
  ]);
  if (nextName !== name || nextSymbol !== symbol || nextSupply !== supply || nextOwner !== owner) {
    throw new Error("Name, symbol, supply, or owner changed during the upgrade. Inspect the proxy before using it.");
  }

  const recordPath = appendActionRecord(definition.name, {
    action: "upgrade",
    network: definition.name,
    chainId: definition.chainId,
    token: tokenAddress,
    signer: signer.address,
    transaction: receipt.hash,
    detail: `Implementation changed from ${currentImplementation} to ${nextImplementation}.`,
    at: new Date().toISOString(),
  });
  console.log(`New implementation: ${nextImplementation}`);
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, {
    Proxy: tokenAddress,
    PreviousImplementation: currentImplementation,
    Implementation: nextImplementation,
    ProxyAdmin: adminAddress,
  });
  printTransaction(definition, receipt.hash);
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
