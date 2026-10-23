import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { deployTokenFixture } from "./helpers/fixture";

describe("Token transfers and allowances", () => {
  it("transfers between wallets and emits both transfer events", async () => {
    const { token, deployer, alice, config } = await loadFixture(deployTokenFixture);
    const amount = ethers.parseUnits("5", 18);

    await expect(token.transfer(alice.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(deployer.address, alice.address, amount)
      .and.to.emit(token, "TransferFlapToken")
      .withArgs(deployer.address, alice.address, amount);

    expect(await token.balanceOf(alice.address)).to.equal(amount);
    expect(await token.balanceOf(deployer.address)).to.equal(config.rawInitialSupply - amount);
    expect(await token.totalSupply()).to.equal(config.rawInitialSupply);
  });

  it("transfers the full balance and allows a zero-value transfer", async () => {
    const { token, deployer, alice, config } = await loadFixture(deployTokenFixture);

    await expect(token.transfer(alice.address, 0n))
      .to.emit(token, "Transfer")
      .withArgs(deployer.address, alice.address, 0n);
    await token.transfer(alice.address, config.rawInitialSupply);

    expect(await token.balanceOf(deployer.address)).to.equal(0n);
    expect(await token.balanceOf(alice.address)).to.equal(config.rawInitialSupply);
    expect(await token.totalSupply()).to.equal(config.rawInitialSupply);
  });

  it("reverts on insufficient balance and the zero address", async () => {
    const { token, alice, bob } = await loadFixture(deployTokenFixture);

    await expect(token.connect(alice).transfer(bob.address, 1n)).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance",
    );
    await expect(token.transfer(ethers.ZeroAddress, 1n)).to.be.revertedWith(
      "ERC20: transfer to the zero address",
    );
    await expect(token.approve(ethers.ZeroAddress, 1n)).to.be.revertedWith(
      "ERC20: approve to the zero address",
    );
  });

  it("updates allowances and supports transferFrom", async () => {
    const { token, deployer, alice, bob, config } = await loadFixture(deployTokenFixture);

    await expect(token.approve(alice.address, 100n))
      .to.emit(token, "Approval")
      .withArgs(deployer.address, alice.address, 100n);
    await token.increaseAllowance(alice.address, 50n);
    expect(await token.allowance(deployer.address, alice.address)).to.equal(150n);
    await token.decreaseAllowance(alice.address, 25n);
    expect(await token.allowance(deployer.address, alice.address)).to.equal(125n);

    await token.connect(alice).transferFrom(deployer.address, bob.address, 40n);
    expect(await token.allowance(deployer.address, alice.address)).to.equal(85n);
    expect(await token.balanceOf(bob.address)).to.equal(40n);
    expect(await token.totalSupply()).to.equal(config.rawInitialSupply);

    await expect(token.decreaseAllowance(alice.address, 86n)).to.be.revertedWith(
      "ERC20: decreased allowance below zero",
    );
    await expect(token.connect(alice).transferFrom(deployer.address, bob.address, 86n)).to.be.revertedWith(
      "ERC20: insufficient allowance",
    );
  });
});
