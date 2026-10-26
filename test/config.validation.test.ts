import { expect } from "chai";
import { ethers } from "hardhat";

import {
  DEFAULT_RAW_INITIAL_SUPPLY,
  LOCAL_METADATA_URI,
  resolveTokenConfig,
  selectTokenEnv,
} from "../config/token.config";

const DEPLOYER = "0x0000000000000000000000000000000000000001";
const V2 = "0x0000000000000000000000000000000000000002";
const V3 = "0x0000000000000000000000000000000000000003";

const PUBLIC_ENV = {
  TOKEN_METADATA_URI: LOCAL_METADATA_URI,
  INITIAL_OWNER: DEPLOYER,
  INITIAL_SUPPLY_RECIPIENT: DEPLOYER,
  UNISWAP_V2_POOL_ADDRESS: V2,
  UNISWAP_V3_POOL_ADDRESS: V3,
};

describe("Deployment configuration", () => {
  it("uses the one-billion-token default and local accounts only when no addresses are configured", () => {
    const config = resolveTokenConfig({}, "hardhat", DEPLOYER, {
      v2PoolAddress: V2,
      v3PoolAddress: V3,
      metadataURI: LOCAL_METADATA_URI,
    });

    expect(config.name).to.equal("Independent Token");
    expect(config.symbol).to.equal("INDT");
    expect(config.decimals).to.equal(18);
    expect(config.initialSupply).to.equal("1000000000");
    expect(config.rawInitialSupply).to.equal(DEFAULT_RAW_INITIAL_SUPPLY);
    expect(config.initialOwner).to.equal(ethers.getAddress(DEPLOYER));
    expect(config.initialSupplyRecipient).to.equal(ethers.getAddress(DEPLOYER));
    expect(config.usingLocalDefaults).to.equal(true);
  });

  it("keeps name and supply on a local network and ignores address settings", () => {
    const selected = selectTokenEnv(
      {
        ...PUBLIC_ENV,
        TOKEN_NAME: "Independent Token",
        TOKEN_INITIAL_SUPPLY: "1000000000",
      },
      "local",
    );
    expect(selected.INITIAL_OWNER).to.equal(undefined);
    expect(selected.UNISWAP_V2_POOL_ADDRESS).to.equal(undefined);
    expect(selected.TOKEN_METADATA_URI).to.equal(undefined);
    expect(selected.TOKEN_NAME).to.equal("Independent Token");

    const config = resolveTokenConfig(selected, "hardhat", DEPLOYER, {
      v2PoolAddress: V2,
      v3PoolAddress: V3,
      metadataURI: LOCAL_METADATA_URI,
    });
    expect(config.usingLocalDefaults).to.equal(true);
    expect(config.initialOwner).to.equal(ethers.getAddress(DEPLOYER));
    expect(selectTokenEnv(PUBLIC_ENV, "mainnet").INITIAL_OWNER).to.equal(DEPLOYER);
  });

  it("accepts an explicit public-network configuration", () => {
    const config = resolveTokenConfig(PUBLIC_ENV, "bscTestnet", DEPLOYER, undefined);
    expect(config.networkKind).to.equal("testnet");
    expect(config.usingLocalDefaults).to.equal(false);
    expect(config.v2PoolAddress).to.equal(ethers.getAddress(V2));
    expect(config.v3PoolAddress).to.equal(ethers.getAddress(V3));
  });

  it("rejects incomplete public configuration and silent address substitution", () => {
    expect(() => resolveTokenConfig({}, "bsc", DEPLOYER, {
      v2PoolAddress: V2,
      v3PoolAddress: V3,
      metadataURI: LOCAL_METADATA_URI,
    })).to.throw(/TOKEN_METADATA_URI/);

    expect(() => resolveTokenConfig({ TOKEN_METADATA_URI: LOCAL_METADATA_URI }, "hardhat", DEPLOYER, {
      v2PoolAddress: V2,
      v3PoolAddress: V3,
      metadataURI: LOCAL_METADATA_URI,
    })).to.throw(/INITIAL_OWNER/);
  });

  it("rejects mismatched recipients, bad decimals, and unsafe pool addresses", () => {
    expect(() =>
      resolveTokenConfig(
        { ...PUBLIC_ENV, INITIAL_SUPPLY_RECIPIENT: V2 },
        "bscTestnet",
        DEPLOYER,
        undefined,
      ),
    ).to.throw(/INITIAL_SUPPLY_RECIPIENT/);

    expect(() =>
      resolveTokenConfig({ ...PUBLIC_ENV, TOKEN_DECIMALS: "8" }, "bscTestnet", DEPLOYER, undefined),
    ).to.throw(/TOKEN_DECIMALS/);

    expect(() =>
      resolveTokenConfig(
        { ...PUBLIC_ENV, TOKEN_METADATA_URI: "http://example.com/token" },
        "bscTestnet",
        DEPLOYER,
        undefined,
      ),
    ).to.throw(/TOKEN_METADATA_URI/);

    expect(() =>
      resolveTokenConfig(
        { ...PUBLIC_ENV, UNISWAP_V2_POOL_ADDRESS: ethers.ZeroAddress },
        "bscTestnet",
        DEPLOYER,
        undefined,
      ),
    ).to.throw(/zero address/);

    expect(() =>
      resolveTokenConfig(
        { ...PUBLIC_ENV, UNISWAP_V3_POOL_ADDRESS: DEPLOYER },
        "bscTestnet",
        DEPLOYER,
        undefined,
      ),
    ).to.throw(/must not be the deployment wallet/);
  });
});
