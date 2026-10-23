import { ethers, network } from "hardhat";

import { explorerAddressUrl, getNetworkDefinition, type NetworkDefinition } from "../../config/networks";
import { describeTokenConfig, type ResolvedTokenConfig } from "../../config/token.config";

export async function assertConnectedNetwork(): Promise<NetworkDefinition> {
  const definition = getNetworkDefinition(network.name);
  if (definition.rpcEnv !== undefined && (process.env[definition.rpcEnv] ?? "").trim().length === 0) {
    throw new Error(`${definition.rpcEnv} is required for ${definition.name}.`);
  }
  let chainId: bigint;
  try {
    chainId = (await ethers.provider.getNetwork()).chainId;
    await ethers.provider.getBlockNumber();
  } catch {
    const envName = definition.rpcEnv ?? "the RPC endpoint";
    throw new Error(`${envName} did not answer. Check the URL and try again.`);
  }
  if (chainId !== BigInt(definition.chainId)) {
    throw new Error(
      `Chain id mismatch for ${definition.name}: connected to ${chainId.toString()}, expected ${definition.chainId}.`,
    );
  }
  return definition;
}

export async function printPublicDeploymentPreview(config: ResolvedTokenConfig): Promise<void> {
  const deployer = await ethers.getSigner(config.deployer);
  const balance = await ethers.provider.getBalance(deployer.address);
  const factory = await ethers.getContractFactory("TokenV2", deployer);
  const deploymentTx = await factory.getDeployTransaction();
  if (deploymentTx.data === undefined) {
    throw new Error("Implementation deployment transaction has no data.");
  }
  const gas = await ethers.provider.estimateGas({
    data: deploymentTx.data,
    from: deployer.address,
  });
  const feeData = await ethers.provider.getFeeData();
  const feePerGas = feeData.gasPrice ?? feeData.maxFeePerGas;
  if (feePerGas === null) {
    throw new Error("The RPC did not return a gas price.");
  }
  const implementationCost = gas * feePerGas;
  const minimumBalance = implementationCost * 3n;

  console.log(describeTokenConfig(config));
  console.log(`Deployer balance: ${ethers.formatEther(balance)} native coin`);
  console.log(
    `Estimated implementation deployment: ${gas.toString()} gas at ${ethers.formatUnits(feePerGas, "gwei")} gwei, about ${ethers.formatEther(implementationCost)} native coin.`,
  );
  console.log(
    "Proxy admin deployment, proxy deployment, and initialization require additional gas. The check below reserves three times the implementation estimate.",
  );
  console.log(
    "Buying and selling through the configured pool addresses is not possible while transfer constraints are enabled.",
  );
  console.log("This deployment will not remove those constraints.");

  if (balance < minimumBalance) {
    throw new Error(
      `Deployer balance ${ethers.formatEther(balance)} is below the safety minimum ${ethers.formatEther(minimumBalance)}.`,
    );
  }

  await warnAboutPools(config);
}

export async function warnAboutPools(config: ResolvedTokenConfig): Promise<void> {
  for (const [label, address] of [
    ["V2", config.v2PoolAddress],
    ["V3", config.v3PoolAddress],
  ] as const) {
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      console.log(
        `${label} pool ${address} has no contract code. The reference describes these as predicted pool addresses, so that can be valid before the pool exists. Transfers involving it still revert while constraints are enabled.`,
      );
    }
  }
}

export function printExplorers(definition: NetworkDefinition, addresses: Record<string, string>): void {
  for (const [label, address] of Object.entries(addresses)) {
    const url = explorerAddressUrl(definition, address);
    if (url === undefined) {
      console.log(`${label}: ${address}`);
      continue;
    }
    console.log(`${label}: ${url}`);
  }
}
