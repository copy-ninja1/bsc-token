import { ethers, upgrades } from "hardhat";

import { asTokenV2 } from "../types/tokenV2";
import { failureMessage } from "./lib/errors";
import { readDeploymentRecord } from "./lib/record";
import { assertConnectedNetwork, printExplorers } from "./lib/safety";

async function main(): Promise<void> {
  const definition = await assertConnectedNetwork();
  const configured = process.env.TOKEN_ADDRESS?.trim();
  const proxyAddress = ethers.getAddress(configured && configured.length > 0
    ? configured
    : readDeploymentRecord(definition.name).proxy);
  const token = asTokenV2(await ethers.getContractAt("TokenV2", proxyAddress));
  const [name, symbol, decimals, totalSupply, maxSupply, owner, metaURI, constraints, pools, ownerBalance] =
    await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.maxSupply(),
      token.owner(),
      token.metaURI(),
      token.transferConstraints(),
      token.pools(),
      token.balanceOf(await token.owner()),
    ]);
  const implementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const proxyAdmin = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log(`Proxy: ${proxyAddress}`);
  console.log(`Implementation: ${implementation}`);
  console.log(`Proxy admin: ${proxyAdmin}`);
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`${symbol} is the configured symbol of an independent token. It is not Bitcoin.`);
  console.log(`Decimals: ${decimals.toString()}`);
  console.log(`Total supply: ${ethers.formatUnits(totalSupply, decimals)} (${totalSupply.toString()} base units)`);
  console.log(`maxSupply: ${maxSupply.toString()}`);
  console.log(`Owner: ${owner}`);
  console.log(`Owner balance: ${ethers.formatUnits(ownerBalance, decimals)}`);
  console.log(`Metadata URI: ${metaURI}`);
  console.log(`Transfer constraints enabled: ${constraints}`);
  console.log(`V2 pool: ${pools[0]}`);
  console.log(`V3 pool: ${pools[1]}`);
  if (constraints) {
    console.log("Transfers to or from the configured pools currently revert.");
  } else {
    console.log("Pool transfer constraints are off. That does not mean a market or liquidity exists.");
  }
  printExplorers(definition, {
    Proxy: proxyAddress,
    Implementation: implementation,
    ProxyAdmin: proxyAdmin,
  });
}

main().catch((error: unknown) => {
  console.error(failureMessage(error));
  process.exitCode = 1;
});
