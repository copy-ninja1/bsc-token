import { network } from "hardhat";

import { EVM_VERSION, OPTIMIZER_RUNS, SOLIDITY_VERSION } from "../config/compiler";
import { deployImplementation, validateTokenStorage } from "./lib/deployToken";
import { failureMessage } from "./lib/errors";
import { confirmDeployment } from "./lib/prompt";
import { writeImplementationRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";

async function main(): Promise<void> {
  if (network.name === "hardhat") {
    throw new Error(
      "An implementation-only deployment does not persist on the in-process Hardhat network. Use npm run deploy:local, or run this script against localhost, bscTestnet, or bsc.",
    );
  }
  const definition = await assertConnectedNetwork();
  await confirmDeployment(definition.kind);
  await validateTokenStorage();
  const implementation = await deployImplementation();
  const recordPath = writeImplementationRecord({
    network: definition.name,
    chainId: definition.chainId,
    implementation: implementation.address,
    transaction: implementation.transaction,
    compilerVersion: SOLIDITY_VERSION,
    optimizerRuns: OPTIMIZER_RUNS,
    evmVersion: EVM_VERSION,
    deployedAt: new Date().toISOString(),
  });
  console.log("Implementation deployed. This address is not the token and has no supply.");
  console.log(`Record: ${recordPath}`);
  console.log(`Transaction: ${implementation.transaction}`);
  printExplorers(definition, { Implementation: implementation.address });
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
