import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { DEFAULT_RAW_INITIAL_SUPPLY, LOCAL_METADATA_URI } from "../config/token.config";
import { PROXY_ADMIN, TRANSPARENT_PROXY } from "../scripts/lib/deployToken";
import { asTokenV2 } from "../types/tokenV2";
import { deployProxyWith, deployTokenFixture } from "./helpers/fixture";

const V2_REVERT = "Token: transfer to/from uniswap v2 pool is not allowed";
const V3_REVERT = "Token: transfer to/from uniswap v3 pool is not allowed";

describe("Transfer constraints", () => {
  it("blocks pool transfers, including by the owner, and allows other wallets", async () => {
    const { token, deployer, alice, bob, v2, v3 } = await loadFixture(deployTokenFixture);

    await expect(token.transfer(alice.address, 10n)).to.emit(token, "Transfer");
    await expect(token.connect(alice).transfer(bob.address, 4n)).to.emit(token, "Transfer");
    await expect(token.transfer(v2.address, 1n)).to.be.revertedWith(V2_REVERT);
    await expect(token.transfer(v3.address, 0n)).to.be.revertedWith(V3_REVERT);
    await expect(token.connect(v2).transfer(alice.address, 0n)).to.be.revertedWith(V2_REVERT);
    await expect(token.connect(v3).transfer(deployer.address, 0n)).to.be.revertedWith(V3_REVERT);
    await token.approve(alice.address, 1n);
    await expect(token.connect(alice).transferFrom(deployer.address, v2.address, 1n)).to.be.revertedWith(
      V2_REVERT,
    );
  });

  it("lets only the owner remove constraints, then allows pool transfers without creating a market", async () => {
    const { token, deployer, alice, v2, v3 } = await loadFixture(deployTokenFixture);

    await expect(token.connect(alice).removeTransferConstraints()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    expect(await token.transferConstraints()).to.equal(true);

    await expect(token.removeTransferConstraints())
      .to.emit(token, "TransferConstraintsRemoved")
      .withArgs(deployer.address);
    expect(await token.transferConstraints()).to.equal(false);
    await expect(token.removeTransferConstraints()).to.be.revertedWith(
      "Token: transfer constraints already removed",
    );

    await token.transfer(v2.address, 7n);
    await token.connect(v2).transfer(alice.address, 7n);
    await token.transfer(v3.address, 1n);
    expect(await token.balanceOf(v3.address)).to.equal(1n);
    expect(await token.balanceOf(alice.address)).to.equal(7n);
  });

  it("rejects zero-address pools and a pool equal to the initializer", async () => {
    const { config, deployer } = await loadFixture(deployTokenFixture);

    await expect(
      deployProxyWith(
        ethers.ZeroAddress,
        config.v3PoolAddress,
        "Independent Token",
        "INDT",
        LOCAL_METADATA_URI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Token: v2 pool is the zero address");
    await expect(
      deployProxyWith(
        config.v2PoolAddress,
        ethers.ZeroAddress,
        "Independent Token",
        "INDT",
        LOCAL_METADATA_URI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Token: v3 pool is the zero address");
    await expect(
      deployProxyWith(
        deployer.address,
        config.v3PoolAddress,
        "Independent Token",
        "INDT",
        LOCAL_METADATA_URI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Token: v2 pool is the initializer");
    await expect(
      deployProxyWith(
        config.v2PoolAddress,
        deployer.address,
        "Independent Token",
        "INDT",
        LOCAL_METADATA_URI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Token: v3 pool is the initializer");
  });

  it("rejects a pool address equal to the proxy and treats duplicate pools as the V2 constraint", async () => {
    const [deployer, pool, recipient] = await ethers.getSigners();
    if (deployer === undefined || pool === undefined || recipient === undefined) {
      throw new Error("Missing signers.");
    }
    const factory = await ethers.getContractFactory("TokenV2", deployer);
    const implementation = await factory.deploy();
    await implementation.waitForDeployment();
    const admin = await (await ethers.getContractFactory(PROXY_ADMIN, deployer)).deploy();
    await admin.waitForDeployment();
    const proxy = await (
      await ethers.getContractFactory(TRANSPARENT_PROXY, deployer)
    ).deploy(await implementation.getAddress(), await admin.getAddress(), "0x");
    await proxy.waitForDeployment();
    const token = asTokenV2(await ethers.getContractAt("TokenV2", await proxy.getAddress(), deployer));

    await expect(
      token.initialize(
        await proxy.getAddress(),
        pool.address,
        "Independent Token",
        "INDT",
        LOCAL_METADATA_URI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Token: v2 pool is the token contract");
    await expect(
      token.initialize(
        pool.address,
        await proxy.getAddress(),
        "Independent Token",
        "INDT",
        LOCAL_METADATA_URI,
        DEFAULT_RAW_INITIAL_SUPPLY,
      ),
    ).to.be.revertedWith("Token: v3 pool is the token contract");

    const duplicate = await deployProxyWith(
      pool.address,
      pool.address,
      "Independent Token",
      "INDT",
      LOCAL_METADATA_URI,
      DEFAULT_RAW_INITIAL_SUPPLY,
    );
    await expect(duplicate.transfer(pool.address, 1n)).to.be.revertedWith(V2_REVERT);
    await duplicate.transfer(recipient.address, 3n);
    expect(await duplicate.balanceOf(recipient.address)).to.equal(3n);
  });
});
