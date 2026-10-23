# Independent BNB Smart Chain token

This repository contains an ERC-20 token for BNB Smart Chain. The default name is **BTC Token** and the default symbol is **BTC**.

This token is an independent asset. It is not Bitcoin, it is not issued by Binance, and it is not backed by Bitcoin. The symbol is configuration, not a claim of identity.

The person who will own the token should start with [Deploy the token yourself](docs/DEPLOY-YOURSELF.md). That guide is written for a first deployment. It explains why the command has to be run from the owner's own computer, then walks through the Hardhat steps from installing Node.js to checking the result on BscScan.

The implementation follows the supplied `TokenV2` reference where that behavior is explicit and safe to reproduce. Differences, including security fixes, are listed in [docs/REFERENCE-COMPATIBILITY.md](docs/REFERENCE-COMPATIBILITY.md).

## Token configuration

| Setting | Default |
| --- | --- |
| Name | BTC Token |
| Symbol | BTC |
| Decimals | 18 |
| Initial supply | 1,000,000,000 tokens |
| Raw supply | 1000000000000000000000000000 |
| Standard | ERC-20 and EIP-2612 permit |
| Recipient | The wallet that sends `initialize` |
| Owner | The same wallet |
| Pool constraints | Enabled at initialization |

`maxSupply` records the amount minted during initialization. This implementation has no public or owner mint function. A proxy administrator can still replace the implementation later. That upgrade power is documented in [docs/SECURITY.md](docs/SECURITY.md).

While transfer constraints are enabled, transfers to or from the configured V2 and V3 pool addresses revert. Wallet-to-wallet transfers are allowed. Removing the constraints does not create liquidity or guarantee that an exchange will trade the token.

## Technology

Tested with Node.js **22.21.1** and npm **10.9.4**.

| Component | Pinned version |
| --- | --- |
| Solidity | 0.8.19 |
| Optimizer | enabled, 99999 runs |
| EVM | london |
| viaIR | false |
| Hardhat | 2.29.1 |
| ethers | 6.15.0 |
| TypeScript | 5.9.3 |
| OpenZeppelin Contracts | 4.9.6 |
| OpenZeppelin Contracts Upgradeable | 4.9.6 |
| OpenZeppelin Hardhat Upgrades | 3.9.1 |

Hardhat 2 is pinned because `@openzeppelin/hardhat-upgrades` 3.9.1 supports it together with OpenZeppelin Contracts 4.9. The current Hardhat 3 line requires a different upgrades plugin and is not used here.

Network parameters come from the BNB Chain documentation:

- <https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/>
- <https://docs.bnbchain.org/bnb-smart-chain/developers/wallet-configuration/>

Mainnet chain id is 56. Testnet chain id is 97.

## Prerequisites

- Node.js 22.21.1
- npm 10.9.4
- A dedicated deployment wallet for public networks

Do not put a private key in source code. Copy `.env.example` to `.env` only on the machine that deploys.

## Install and check

```bash
npm install
npm run compile
npm run test
npm run typecheck
npm run lint
```

Coverage:

```bash
npm run test:coverage
```

## Deploy locally

The in-process Hardhat network needs no `.env`. Pool addresses default to Hardhat test accounts and are printed as test accounts, not Uniswap pools.

```bash
npm run deploy:local
```

The script checks the name, symbol, decimals, supply, owner, metadata URI, pools, and constraint flag before it exits. That network state is discarded when the process exits. The JSON file under `deployments/` is a record of the run, not a live token.

For a persistent local node:

```bash
npx hardhat node
npm run deploy:localhost
```

Run the second command in another terminal.

## Deploy to BSC testnet

1. Fund the deployment wallet with testnet BNB.
2. Fill `.env` from `.env.example`.
3. Set `CONFIRM_TESTNET_DEPLOYMENT=true`.
4. Review the printed configuration.
5. Type `DEPLOY` when prompted. In a non-interactive shell, set `DEPLOY_CONFIRMATION=DEPLOY`.

```bash
npm run deploy:testnet
```

The script does not remove transfer constraints, move ownership, or add liquidity.

## Deploy to BSC mainnet

Mainnet deployment is a separate command. It fails unless `CONFIRM_MAINNET_DEPLOYMENT=true`, the RPC reports chain id 56, the configuration is complete, and the confirmation phrase matches.

```bash
npm run deploy:mainnet
```

Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before using it. This repository does not submit a mainnet transaction on its own.

## After deployment

```bash
npm run inspect:testnet
npm run verify:testnet
```

Removing pool constraints is permanent for this implementation and requires its own confirmation:

```bash
npm run constraints:remove:testnet
```

## Remix and verification

- Remix: [docs/REMIX.md](docs/REMIX.md)
- BscScan: [docs/VERIFICATION.md](docs/VERIFICATION.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Token behavior: [docs/TOKENOMICS.md](docs/TOKENOMICS.md)
- Risks: [docs/SECURITY.md](docs/SECURITY.md)

## Troubleshooting

- `PRIVATE_KEY must be a 32-byte hex string` means the key is missing or malformed. The value is not printed.
- `INITIAL_OWNER must be the deployment wallet` means the configured owner is not the signer. This contract mints to and assigns ownership to the `initialize` caller.
- `A deployment record already exists` is the idempotency guard. Set `ALLOW_REDEPLOY=true` only when a second token deployment is intentional.
- An implementation address is not the token. Users must interact with the proxy.
- A verified source listing is not an audit.
