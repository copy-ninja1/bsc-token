import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { DEFAULT_RAW_INITIAL_SUPPLY, LOCAL_METADATA_URI } from "../config/token.config";
import { assertDeployedToken, assertImplementationHasNoSupply } from "../scripts/lib/assertToken";
import { printPublicDeploymentPreview } from "../scripts/lib/safety";
import { PROXY_ADMIN, TRANSPARENT_PROXY, validateTokenStorage } from "../scripts/lib/deployToken";
import { asTokenV2 } from "../types/tokenV2";
import { deployTokenFixture } from "./helpers/fixture";

describe("Proxy deployment", () => {
  it("initializes the proxy atomically and leaves the implementation locked", async () => {
    const fixture = await loadFixture(deployTokenFixture);
    const { token, deployer, implementation, proxy, proxyAdmin, config } = fixture;

    await assertDeployedToken(proxy, config);
    await assertImplementationHasNoSupply(implementation);
    expect(await upgrades.erc1967.getImplementationAddress(proxy)).to.equal(implementation);
    expect(await upgrades.erc1967.getAdminAddress(proxy)).to.equal(proxyAdmin);

    const admin = await ethers.getContractAt(PROXY_ADMIN, proxyAdmin);
    expect(await admin.getFunction("owner").staticCall()).to.equal(deployer.address);

    const implementationToken = asTokenV2(await ethers.getContractAt("TokenV2", implementation));
    await expect(
      implementationToken.initialize(
        config.v2PoolAddress,
        config.v3PoolAddress,
        config.name,
        config.symbol,
        config.metadataURI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Initializable: contract is already initialized");

    await expect(
      token.connect(fixture.alice).initialize(
        config.v2PoolAddress,
        config.v3PoolAddress,
        config.name,
        config.symbol,
        config.metadataURI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Initializable: contract is already initialized");
    expect(await token.balanceOf(deployer.address)).to.equal(DEFAULT_RAW_INITIAL_SUPPLY);
    expect(await token.balanceOf(fixture.alice.address)).to.equal(0n);
  });

  it("shows that a proxy deployed without initialization data can be taken over", async () => {
    const { deployer, alice, v2, v3 } = await loadFixture(deployTokenFixture);
    const factory = await ethers.getContractFactory("TokenV2", deployer);
    const implementation = await factory.deploy();
    await implementation.waitForDeployment();
    const admin = await (await ethers.getContractFactory(PROXY_ADMIN, deployer)).deploy();
    await admin.waitForDeployment();
    const proxy = await (
      await ethers.getContractFactory(TRANSPARENT_PROXY, deployer)
    ).deploy(await implementation.getAddress(), await admin.getAddress(), "0x");
    await proxy.waitForDeployment();

    const taken = asTokenV2(
      await ethers.getContractAt("TokenV2", await proxy.getAddress(), alice),
    );
    await taken.initialize(
      v2.address,
      v3.address,
      "BTC Token",
      "BTC",
      LOCAL_METADATA_URI,
      DEFAULT_RAW_INITIAL_SUPPLY,
    );
    expect(await taken.owner()).to.equal(alice.address);
    expect(await taken.balanceOf(alice.address)).to.equal(DEFAULT_RAW_INITIAL_SUPPLY);
    expect(await taken.balanceOf(deployer.address)).to.equal(0n);
  });

  it("passes the OpenZeppelin transparent-proxy storage validation", async () => {
    await validateTokenStorage();
  });

  it("estimates implementation deployment gas", async () => {
    const { config } = await loadFixture(deployTokenFixture);
    await printPublicDeploymentPreview(config);
  });

  it("does not expose hidden administrative token controls", async () => {
    const { token } = await loadFixture(deployTokenFixture);
    const hidden = new Set([
      "mint",
      "setFee",
      "setTax",
      "blacklist",
      "setBlacklist",
      "enableTrading",
      "setTransferConstraints",
    ]);
    for (const fragment of token.interface.fragments) {
      if (fragment.type === "function" && "name" in fragment && typeof fragment.name === "string") {
        expect(hidden.has(fragment.name)).to.equal(false);
      }
    }
  });
});
