import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { deployTokenFixture } from "./helpers/fixture";

describe("Ownership", () => {
  it("starts with the deployer and rejects unauthorized ownership changes", async () => {
    const { token, deployer, alice } = await loadFixture(deployTokenFixture);

    expect(await token.owner()).to.equal(deployer.address);
    await expect(token.connect(alice).transferOwnership(alice.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(token.connect(alice).renounceOwnership()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(token.transferOwnership(ethers.ZeroAddress)).to.be.revertedWith(
      "Ownable: new owner is the zero address",
    );
    expect(await token.owner()).to.equal(deployer.address);
  });

  it("transfers ownership and gives only the new owner administrative access", async () => {
    const { token, deployer, alice } = await loadFixture(deployTokenFixture);

    await expect(token.transferOwnership(alice.address))
      .to.emit(token, "OwnershipTransferred")
      .withArgs(deployer.address, alice.address);
    expect(await token.owner()).to.equal(alice.address);
    await expect(token.removeTransferConstraints()).to.be.revertedWith("Ownable: caller is not the owner");
    await token.connect(alice).removeTransferConstraints();
    expect(await token.transferConstraints()).to.equal(false);
  });

  it("makes renunciation irreversible", async () => {
    const { token, deployer, alice } = await loadFixture(deployTokenFixture);

    await expect(token.renounceOwnership())
      .to.emit(token, "OwnershipTransferred")
      .withArgs(deployer.address, ethers.ZeroAddress);
    expect(await token.owner()).to.equal(ethers.ZeroAddress);
    expect(await token.transferConstraints()).to.equal(true);
    await expect(token.removeTransferConstraints()).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(token.connect(alice).transferOwnership(alice.address)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });
});
