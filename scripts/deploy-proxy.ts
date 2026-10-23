import { ethers, network } from "hardhat";

import { describeTokenConfig } from "../config/token.config";
import { assertDeployedToken, assertImplementationHasNoSupply } from "./lib/assertToken";
import { deployConfiguredToken } from "./lib/deployToken";
import { failureMessage } from "./lib/errors";
import { loadTokenConfig } from "./lib/loadConfig";
import { confirmDeployment } from "./lib/prompt";
import { assertNoExistingDeployment, readImplementationRecord, writeDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers, printPublicDeploymentPreview } from "./lib/safety";

async function main(): Promise<void> {
  if (network.name === "hardhat") {
    throw new Error(
      "Split proxy deployment does not persist on the in-process Hardhat network. Use npm run deploy:local or a persistent network.",
    );
  }
  const definition = await assertConnectedNetwork();
  const config = await loadTokenConfig();
  assertNoExistingDeployment(definition.name);
  const implementationAddress =
    process.env.IMPLEMENTATION_ADDRESS?.trim() || readImplementationRecord(definition.name).implementation;
  if (!ethers.isAddress(implementationAddress)) {
    throw new Error("IMPLEMENTATION_ADDRESS is not a valid address.");
  }

  if (definition.kind === "local") {
    console.log(describeTokenConfig(config));
  } else {
    await printPublicDeploymentPreview(config);
  }
  console.log(`Using implementation ${ethers.getAddress(implementationAddress)}.`);
  await confirmDeployment(definition.kind);

  const deployed = await deployConfiguredToken(config, ethers.getAddress(implementationAddress));
  await assertImplementationHasNoSupply(deployed.implementation);
  await assertDeployedToken(deployed.proxy, config);
  const recordPath = writeDeploymentRecord(config, definition.chainId, {
    implementation: deployed.implementation,
    proxy: deployed.proxy,
    proxyAdmin: deployed.proxyAdmin,
    implementationTransaction: deployed.implementationTransaction || "existing-implementation",
    proxyAdminTransaction: deployed.proxyAdminTransaction,
    proxyTransaction: deployed.proxyTransaction,
    initializeData: deployed.initializeData,
    transferConstraintsEnabled: true,
  });
  console.log("Proxy deployment checks passed.");
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, {
    Proxy: deployed.proxy,
    Implementation: deployed.implementation,
    ProxyAdmin: deployed.proxyAdmin,
  });
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
