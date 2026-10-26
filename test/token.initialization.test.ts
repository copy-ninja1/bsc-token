import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { DEFAULT_RAW_INITIAL_SUPPLY, LOCAL_METADATA_URI } from "../config/token.config";
import { deployProxyWith, deployTokenFixture } from "./helpers/fixture";

const SUPPLY = DEFAULT_RAW_INITIAL_SUPPLY;

describe("Token initialization", () => {
  it("sets the name, symbol, decimals, owner, metadata, and pools", async () => {
    const { token, config, deployer } = await loadFixture(deployTokenFixture);

    expect(await token.name()).to.equal(config.name);
    expect(await token.symbol()).to.equal("INDT");
    expect(await token.decimals()).to.equal(18n);
    expect(await token.owner()).to.equal(deployer.address);
    expect(await token.metaURI()).to.equal(LOCAL_METADATA_URI);
    expect(await token.transferConstraints()).to.equal(true);
    expect(await token.pools()).to.deep.equal([config.v2PoolAddress, config.v3PoolAddress]);
    expect(await token.maxSupply()).to.equal(SUPPLY);
  });

  it("emits the mint events once from the proxy deployment", async () => {
    const { token, deployer, proxyTransaction } = await loadFixture(deployTokenFixture);
    const deployment = await ethers.provider.getTransaction(proxyTransaction);
    if (deployment === null) {
      throw new Error("Proxy deployment transaction is missing.");
    }

    await expect(deployment)
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, deployer.address, SUPPLY);
    await expect(deployment)
      .to.emit(token, "TransferFlapToken")
      .withArgs(ethers.ZeroAddress, deployer.address, SUPPLY);
    await expect(deployment)
      .to.emit(token, "OwnershipTransferred")
      .withArgs(ethers.ZeroAddress, deployer.address);
  });

  it("rejects a second initialization", async () => {
    const { token, config, deployer } = await loadFixture(deployTokenFixture);

    await expect(
      token.initialize(
        config.v2PoolAddress,
        config.v3PoolAddress,
        config.name,
        config.symbol,
        config.metadataURI,
        SUPPLY,
      ),
    ).to.be.revertedWith("Initializable: contract is already initialized");
    expect(await token.balanceOf(deployer.address)).to.equal(SUPPLY);
    expect(await token.totalSupply()).to.equal(SUPPLY);
  });

  it("rejects an empty name, symbol, metadata URI, or zero supply", async () => {
    const { config } = await loadFixture(deployTokenFixture);

    await expect(
      deployProxyWith(config.v2PoolAddress, config.v3PoolAddress, "", "INDT", config.metadataURI, SUPPLY),
    ).to.be.revertedWith("Token: name is empty");
    await expect(
      deployProxyWith(config.v2PoolAddress, config.v3PoolAddress, "Independent Token", "", config.metadataURI, SUPPLY),
    ).to.be.revertedWith("Token: symbol is empty");
    await expect(
      deployProxyWith(config.v2PoolAddress, config.v3PoolAddress, "Independent Token", "INDT", "", SUPPLY),
    ).to.be.revertedWith("Token: metadata URI is empty");
    await expect(
      deployProxyWith(config.v2PoolAddress, config.v3PoolAddress, "Independent Token", "INDT", config.metadataURI, 0n),
    ).to.be.revertedWith("Token: max supply is zero");
  });
});
