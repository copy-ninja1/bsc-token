import { network } from "hardhat";

import { describeTokenConfig } from "../config/token.config";
import { assertDeployedToken, assertImplementationHasNoSupply } from "./lib/assertToken";
import { deployConfiguredToken, validateTokenStorage } from "./lib/deployToken";
import { failureMessage } from "./lib/errors";
import { loadTokenConfig } from "./lib/loadConfig";
import { confirmDeployment } from "./lib/prompt";
import { assertNoExistingDeployment, writeDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers, printPublicDeploymentPreview, warnAboutPools } from "./lib/safety";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  const config = await loadTokenConfig();
  assertNoExistingDeployment(definition.name);

  if (definition.kind === "local") {
    console.log(describeTokenConfig(config));
    await warnAboutPools(config);
  } else {
    await printPublicDeploymentPreview(config);
  }

  await confirmDeployment(definition.kind);
  await validateTokenStorage();
  const deployed = await deployConfiguredToken(config);
  await assertImplementationHasNoSupply(deployed.implementation);
  await assertDeployedToken(deployed.proxy, config);

  const recordPath = writeDeploymentRecord(config, definition.chainId, {
    implementation: deployed.implementation,
    proxy: deployed.proxy,
    proxyAdmin: deployed.proxyAdmin,
    implementationTransaction: deployed.implementationTransaction,
    proxyAdminTransaction: deployed.proxyAdminTransaction,
    proxyTransaction: deployed.proxyTransaction,
    initializeData: deployed.initializeData,
    transferConstraintsEnabled: true,
  });

  console.log("Deployment checks passed.");
  console.log(`Record: ${recordPath}`);
  printExplorers(definition, {
    Proxy: deployed.proxy,
    Implementation: deployed.implementation,
    ProxyAdmin: deployed.proxyAdmin,
  });
  console.log(`Proxy transaction: ${deployed.proxyTransaction}`);
  console.log(`Implementation transaction: ${deployed.implementationTransaction}`);
  console.log(`Proxy admin transaction: ${deployed.proxyAdminTransaction}`);
  if (network.name === "hardhat") {
    console.log("The in-process Hardhat network discarded this state when the script exited.");
  }
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
