import { ethers, upgrades } from "hardhat";
import { Contract, type ContractTransactionReceipt, type ContractTransactionResponse } from "ethers";

import type { ResolvedTokenConfig } from "../../config/token.config";
import { asTokenV2, type TokenV2 } from "../../types/tokenV2";
import { failureMessage, includesReason } from "./errors";

export const PROXY_ADMIN = "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin";
export const TRANSPARENT_PROXY =
  "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy";

export interface DeployedToken {
  token: TokenV2;
  implementation: string;
  proxy: string;
  proxyAdmin: string;
  implementationTransaction: string;
  proxyAdminTransaction: string;
  proxyTransaction: string;
  initializeData: string;
}

async function requireReceipt(
  tx: ContractTransactionResponse | null,
  label: string,
): Promise<ContractTransactionReceipt> {
  if (tx === null) {
    throw new Error(`${label} did not return a transaction.`);
  }
  const receipt = await tx.wait();
  if (receipt === null) {
    throw new Error(`${label} did not return a receipt.`);
  }
  if (receipt.status !== 1) {
    throw new Error(`${label} failed in transaction ${receipt.hash}.`);
  }
  return receipt;
}

export async function validateTokenStorage(): Promise<void> {
  const factory = await ethers.getContractFactory("TokenV2");
  await upgrades.validateImplementation(factory, { kind: "transparent" });
}

export async function deployImplementation(): Promise<{
  address: string;
  transaction: string;
  contract: TokenV2;
}> {
  const deployer = (await ethers.getSigners())[0];
  if (deployer === undefined) {
    throw new Error("No deployer account is available.");
  }
  const factory = await ethers.getContractFactory("TokenV2", deployer);
  const implementation = await factory.deploy();
  const receipt = await requireReceipt(implementation.deploymentTransaction(), "Implementation deployment");
  const address = await implementation.getAddress();
  await assertImplementationLocked(asTokenV2(implementation));
  return {
    address,
    transaction: receipt.hash,
    contract: asTokenV2(implementation),
  };
}

export async function deployConfiguredToken(
  config: ResolvedTokenConfig,
  implementationAddress?: string,
): Promise<DeployedToken> {
  const deployer = await ethers.getSigner(config.deployer);
  const implementation =
    implementationAddress === undefined
      ? await deployImplementation()
      : {
          address: ethers.getAddress(implementationAddress),
          transaction: "",
          contract: asTokenV2(await ethers.getContractAt("TokenV2", implementationAddress, deployer)),
        };

  if (implementationAddress !== undefined) {
    await assertImplementationLocked(implementation.contract);
    const code = await ethers.provider.getCode(implementation.address);
    if (code === "0x") {
      throw new Error("IMPLEMENTATION_ADDRESS has no contract code.");
    }
  }

  const tokenFactory = await ethers.getContractFactory("TokenV2", deployer);
  const initializeData = tokenFactory.interface.encodeFunctionData("initialize", [
    config.v2PoolAddress,
    config.v3PoolAddress,
    config.name,
    config.symbol,
    config.metadataURI,
    config.rawInitialSupply,
  ]);
  if (initializeData.length <= 2) {
    throw new Error("Refusing to deploy a proxy without initialization data.");
  }

  const proxyAdminFactory = await ethers.getContractFactory(PROXY_ADMIN, deployer);
  const proxyAdmin = await proxyAdminFactory.deploy();
  const proxyAdminReceipt = await requireReceipt(proxyAdmin.deploymentTransaction(), "Proxy admin deployment");
  const proxyAdminAddress = await proxyAdmin.getAddress();

  const proxyFactory = await ethers.getContractFactory(TRANSPARENT_PROXY, deployer);
  const proxy = await proxyFactory.deploy(implementation.address, proxyAdminAddress, initializeData);
  const proxyReceipt = await requireReceipt(proxy.deploymentTransaction(), "Proxy deployment");
  const proxyAddress = await proxy.getAddress();

  const implementationSlot = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminSlot = await upgrades.erc1967.getAdminAddress(proxyAddress);
  if (implementationSlot !== implementation.address) {
    throw new Error("Proxy implementation slot does not match the deployed implementation.");
  }
  if (adminSlot !== proxyAdminAddress) {
    throw new Error("Proxy admin slot does not match the deployed ProxyAdmin.");
  }

  const token = asTokenV2(await ethers.getContractAt("TokenV2", proxyAddress, deployer));

  return {
    token,
    implementation: implementation.address,
    proxy: proxyAddress,
    proxyAdmin: proxyAdminAddress,
    implementationTransaction: implementation.transaction,
    proxyAdminTransaction: proxyAdminReceipt.hash,
    proxyTransaction: proxyReceipt.hash,
    initializeData,
  };
}

async function assertImplementationLocked(implementation: TokenV2): Promise<void> {
  const contract = new Contract(
    await implementation.getAddress(),
    implementation.interface,
    implementation.runner,
  );
  try {
    await contract.getFunction("initialize").staticCall(
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
      "Locked",
      "LOCKED",
      "https://example.com/locked",
      1n,
    );
  } catch (error: unknown) {
    if (includesReason(error, "Initializable: contract is already initialized")) {
      return;
    }
    throw new Error(`Implementation initializer check failed: ${failureMessage(error)}`);
  }
  throw new Error("Refusing to use an implementation whose initializer is still active.");
}
