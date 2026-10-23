import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { DEFAULT_RAW_INITIAL_SUPPLY } from "../config/token.config";
import { asTokenV2 } from "../types/tokenV2";
import { deployTokenFixture } from "./helpers/fixture";

describe("Token supply", () => {
  it("mints one billion tokens with 18 decimals exactly once to the deployer", async () => {
    const { token, deployer, alice, v2, v3 } = await loadFixture(deployTokenFixture);

    expect(DEFAULT_RAW_INITIAL_SUPPLY).to.equal(1000000000000000000000000000n);
    expect(await token.totalSupply()).to.equal(DEFAULT_RAW_INITIAL_SUPPLY);
    expect(await token.maxSupply()).to.equal(DEFAULT_RAW_INITIAL_SUPPLY);
    expect(await token.balanceOf(deployer.address)).to.equal(DEFAULT_RAW_INITIAL_SUPPLY);
    expect(await token.balanceOf(alice.address)).to.equal(0n);
    expect(await token.balanceOf(v2.address)).to.equal(0n);
    expect(await token.balanceOf(v3.address)).to.equal(0n);
  });

  it("does not change total supply when tokens move", async () => {
    const { token, alice, config } = await loadFixture(deployTokenFixture);

    await token.transfer(alice.address, ethers.parseUnits("25", 18));
    expect(await token.totalSupply()).to.equal(config.rawInitialSupply);
    expect(await token.maxSupply()).to.equal(config.rawInitialSupply);
  });

  it("leaves the implementation contract with no supply and exposes no mint function", async () => {
    const { token, implementation } = await loadFixture(deployTokenFixture);
    const implementationToken = asTokenV2(await ethers.getContractAt("TokenV2", implementation));

    expect(await implementationToken.totalSupply()).to.equal(0n);
    expect(await implementationToken.owner()).to.equal(ethers.ZeroAddress);
    for (const fragment of token.interface.fragments) {
      if (fragment.type === "function" && "name" in fragment && typeof fragment.name === "string") {
        expect(fragment.name).to.not.equal("mint");
        expect(fragment.name).to.not.equal("burn");
      }
    }
  });
});
