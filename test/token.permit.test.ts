import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import type { TokenV2 } from "../types/tokenV2";
import { deployTokenFixture } from "./helpers/fixture";

const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

async function permitDomain(token: TokenV2, chainId = 0): Promise<{
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}> {
  const network = await ethers.provider.getNetwork();
  return {
    name: await token.name(),
    version: "1",
    chainId: chainId === 0 ? Number(network.chainId) : chainId,
    verifyingContract: await token.getAddress(),
  };
}

describe("EIP-2612 permit", () => {
  it("accepts a valid signature, increments the nonce, and rejects replay", async () => {
    const { token, deployer, alice, bob } = await loadFixture(deployTokenFixture);
    const domain = await permitDomain(token);
    const value = 1000n;
    const deadline = ethers.MaxUint256;
    const signature = await deployer.signTypedData(domain, PERMIT_TYPES, {
      owner: deployer.address,
      spender: alice.address,
      value,
      nonce: 0n,
      deadline,
    });
    const { v, r, s } = ethers.Signature.from(signature);

    expect(await token.DOMAIN_SEPARATOR()).to.equal(ethers.TypedDataEncoder.hashDomain(domain));
    expect(await token.nonces(deployer.address)).to.equal(0n);

    await expect(token.permit(deployer.address, alice.address, value, deadline, v, r, s))
      .to.emit(token, "Approval")
      .withArgs(deployer.address, alice.address, value);
    expect(await token.allowance(deployer.address, alice.address)).to.equal(value);
    expect(await token.nonces(deployer.address)).to.equal(1n);

    await token.connect(alice).transferFrom(deployer.address, bob.address, 25n);
    expect(await token.balanceOf(bob.address)).to.equal(25n);
    await expect(token.permit(deployer.address, alice.address, value, deadline, v, r, s)).to.be.revertedWith(
      "ERC20Permit: invalid signature",
    );
    expect(await token.nonces(deployer.address)).to.equal(1n);
  });

  it("rejects expired, cross-chain, and wrong-signer signatures without spending a nonce", async () => {
    const { token, deployer, alice } = await loadFixture(deployTokenFixture);
    const domain = await permitDomain(token);
    const deadline = ethers.MaxUint256;

    await expect(
      token.permit(deployer.address, alice.address, 1n, 1n, 27, ethers.ZeroHash, ethers.ZeroHash),
    ).to.be.revertedWith("ERC20Permit: expired deadline");
    expect(await token.nonces(deployer.address)).to.equal(0n);

    const wrongSigner = await alice.signTypedData(domain, PERMIT_TYPES, {
      owner: deployer.address,
      spender: alice.address,
      value: 5n,
      nonce: 0n,
      deadline,
    });
    const wrong = ethers.Signature.from(wrongSigner);
    await expect(
      token.permit(deployer.address, alice.address, 5n, deadline, wrong.v, wrong.r, wrong.s),
    ).to.be.revertedWith("ERC20Permit: invalid signature");

    const otherChain = await deployer.signTypedData(await permitDomain(token, 56), PERMIT_TYPES, {
      owner: deployer.address,
      spender: alice.address,
      value: 5n,
      nonce: 0n,
      deadline,
    });
    const crossChain = ethers.Signature.from(otherChain);
    await expect(
      token.permit(deployer.address, alice.address, 5n, deadline, crossChain.v, crossChain.r, crossChain.s),
    ).to.be.revertedWith("ERC20Permit: invalid signature");
    expect(await token.nonces(deployer.address)).to.equal(0n);
  });
});
