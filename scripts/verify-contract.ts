import { run } from "hardhat";

import { failureMessage } from "./lib/errors";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork } from "./lib/safety";

const IMPLEMENTATION = "contracts/TokenV2.sol:TokenV2";
const PROXY_ADMIN = "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin";
const TRANSPARENT_PROXY =
  "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  if (definition.kind === "local") {
    throw new Error("Explorer verification requires bscTestnet or bsc.");
  }
  if ((process.env.BSCSCAN_API_KEY ?? "").trim().length === 0) {
    throw new Error("BSCSCAN_API_KEY is required. This script does not claim a contract is verified without it.");
  }

  const record = readDeploymentRecord(definition.name);
  if (record.chainId !== definition.chainId) {
    throw new Error("The deployment record chain id does not match the selected network.");
  }

  await run("verify:verify", {
    address: record.implementation,
    constructorArguments: [],
    contract: IMPLEMENTATION,
  });
  await run("verify:verify", {
    address: record.proxyAdmin,
    constructorArguments: [],
    contract: PROXY_ADMIN,
  });
  await run("verify:verify", {
    address: record.proxy,
    constructorArguments: [record.implementation, record.proxyAdmin, record.initializeData],
    contract: TRANSPARENT_PROXY,
  });

  console.log("BscScan accepted the verification requests for the implementation, proxy admin, and proxy.");
  console.log("Verified source is not an independent audit.");
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
