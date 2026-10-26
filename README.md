# Independent BNB Smart Chain token

This repository contains an ERC-20 token for BNB Smart Chain. The default name is **Independent Token** and the default symbol is **INDT**.

This token is an independent asset. It is not Bitcoin, it is not issued by Binance, and it is not backed by Bitcoin. The symbol is configuration, not a claim of identity.

The person who will own the token should start with [Deploy the token yourself](docs/DEPLOY-YOURSELF.md). That guide is written for a first deployment. It explains why the command has to be run from the owner's own computer, then walks through the Hardhat steps from installing Node.js to checking the result on BscScan.

The implementation follows the supplied `TokenV2` reference where that behavior is explicit and safe to reproduce. Differences, including security fixes, are listed in [docs/REFERENCE-COMPATIBILITY.md](docs/REFERENCE-COMPATIBILITY.md).

## Token configuration

| Setting | Default |
| --- | --- |
| Name | Independent Token |
| Symbol | INDT |
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

## Repository layout

```text
contracts/          TokenV2, ITokenV2, and the proxy artifact anchor
config/             Compiler, network, and token deployment settings
scripts/            Deployment, verification, and explicit mainnet actions
scripts/lib/        Shared script helpers
test/               Hardhat tests and the shared fixture
metadata/           Sample off-chain metadata. Not written on-chain by itself
docs/               Deployment, tokenomics, architecture, and risk notes
```

`deployments/*.json` is written by the scripts and gitignored. It is a local record of addresses and initialization calldata, not source code.

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
npm run security:check
```

`security:check` runs [Slither](https://github.com/crytic/slither) on the Hardhat project. The first run creates `.venv` and installs the version pinned in `requirements-dev.txt`. A Slither report is not an audit.

Coverage:

```bash
npm run test:coverage
```

## Deploy locally

The in-process Hardhat network does not use the public deployment wallet. Owner, recipient, pool, and metadata values in `.env` apply on BSC testnet and mainnet. A local run uses the connected Hardhat accounts and prints those pool addresses as test accounts, not Uniswap pools. Name, symbol, decimals, and supply still come from `.env` when they are set.

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

Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before using it. Tests, `npm run compile`, and CI do not run this command and do not send a mainnet transaction.

Adding PancakeSwap liquidity is also separate. It spends the token and BTCB from the signer, and it leaves the LP tokens in that wallet:

```bash
npm run liquidity:add:mainnet
```

The other mainnet commands are `liquidity:remove:mainnet`, `liquidity:lock:mainnet`, `liquidity:inspect:mainnet`, `swap:mainnet`, `balance:mainnet`, `supply:mainnet`, `allowance:mainnet`, `approval:revoke:mainnet`, `token:transfer:mainnet`, `token:burn:mainnet`, `pause:mainnet`, `unpause:mainnet`, `ownership:transfer:mainnet`, `ownership:renounce:mainnet`, and `proxy:upgrade:mainnet`. Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/ADD-LIQUIDITY.md](docs/ADD-LIQUIDITY.md) before running them. Deployment does not run these commands.

`TokenV2` has no `burn`, `pause`, or `unpause` function. `token:burn:mainnet`, `pause:mainnet`, and `unpause:mainnet` inspect the current implementation and exit without sending a transaction when that function is absent. A later upgrade could add them. That upgrade is a separate, confirmed mainnet action.

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
- Liquidity: [docs/ADD-LIQUIDITY.md](docs/ADD-LIQUIDITY.md)
- Logos and listings: [docs/LISTING.md](docs/LISTING.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Token behavior: [docs/TOKENOMICS.md](docs/TOKENOMICS.md)
- Risks: [docs/SECURITY.md](docs/SECURITY.md)

## Troubleshooting

- `PRIVATE_KEY must be a 32-byte hex string` means the key is missing or malformed. The value is not printed.
- `INITIAL_OWNER must be the deployment wallet` means the configured owner is not the signer. This contract mints to and assigns ownership to the `initialize` caller.
- `A deployment record already exists` is the idempotency guard. Set `ALLOW_REDEPLOY=true` only when a second token deployment is intentional.
- An implementation address is not the token. Users must interact with the proxy.
- A verified source listing is not an audit.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report undisclosed vulnerabilities through [SECURITY.md](SECURITY.md). Design limitations of this implementation are in [docs/SECURITY.md](docs/SECURITY.md).

## License

Solidity sources declare `SPDX-License-Identifier: MIT`. This repository does not yet include a root `LICENSE` file. Choose one before publishing the repository. Do not treat the SPDX headers as a license grant for the whole project until that file exists.
