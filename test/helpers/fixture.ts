import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { LOCAL_METADATA_URI, resolveTokenConfig, type ResolvedTokenConfig } from "../../config/token.config";
import {
  PROXY_ADMIN,
  TRANSPARENT_PROXY,
  deployConfiguredToken,
  type DeployedToken,
} from "../../scripts/lib/deployToken";
import { asTokenV2, type TokenV2 } from "../../types/tokenV2";

export interface TokenFixture extends DeployedToken {
  config: ResolvedTokenConfig;
  deployer: HardhatEthersSigner;
  v2: HardhatEthersSigner;
  v3: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
}

export async function deployTokenFixture(): Promise<TokenFixture> {
  const [deployer, v2, v3, alice, bob] = await ethers.getSigners();
  if (
    deployer === undefined ||
    v2 === undefined ||
    v3 === undefined ||
    alice === undefined ||
    bob === undefined
  ) {
    throw new Error("The Hardhat network did not provide the required signers.");
  }

  const config = resolveTokenConfig({}, "hardhat", deployer.address, {
    v2PoolAddress: v2.address,
    v3PoolAddress: v3.address,
    metadataURI: LOCAL_METADATA_URI,
  });
  const deployed = await deployConfiguredToken(config);
  return { ...deployed, config, deployer, v2, v3, alice, bob };
}

export async function deployProxyWith(
  v2Pool: string,
  v3Pool: string,
  name: string,
  symbol: string,
  metadataURI: string,
  maxSupply: bigint,
): Promise<TokenV2> {
  const [deployer] = await ethers.getSigners();
  if (deployer === undefined) {
    throw new Error("No deployer is available.");
  }
  const factory = await ethers.getContractFactory("TokenV2", deployer);
  const implementation = await factory.deploy();
  await implementation.waitForDeployment();
  const adminFactory = await ethers.getContractFactory(PROXY_ADMIN, deployer);
  const admin = await adminFactory.deploy();
  await admin.waitForDeployment();
  const data = factory.interface.encodeFunctionData("initialize", [
    v2Pool,
    v3Pool,
    name,
    symbol,
    metadataURI,
    maxSupply,
  ]);
  const proxyFactory = await ethers.getContractFactory(TRANSPARENT_PROXY, deployer);
  const proxy = await proxyFactory.deploy(await implementation.getAddress(), await admin.getAddress(), data);
  await proxy.waitForDeployment();
  return asTokenV2(await ethers.getContractAt("TokenV2", await proxy.getAddress(), deployer));
}
