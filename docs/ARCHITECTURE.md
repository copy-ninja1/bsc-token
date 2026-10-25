# Architecture

## What was in the supplied source

The workspace contained one flattened file, `Untitled-1`. It includes:

- `TokenV2`, which inherits `ITokenV2`, `ERC20PermitUpgradeable`, and `OwnableUpgradeable`
- `ITokenV2`
- OpenZeppelin upgradeable sources marked 4.4.1 through 4.9.4
- Foundry remappings for OpenZeppelin, Uniswap, PancakeSwap, and other libraries
- Compiler settings: optimizer enabled, 99999 runs, `evmVersion` `london`, `viaIR` false

It does not include a factory, a proxy, a deployment script, or the pool contracts themselves. Those remapped libraries are not in the workspace. This project does not invent them.

The reference import root is the Foundry remapping `@openzeppelin-contracts-upgradeable/`. Hardhat resolves the same contracts from the npm package `@openzeppelin/contracts-upgradeable@4.9.6`.

## Contract hierarchy

`TokenV2` is the only token. It uses OpenZeppelin's audited ERC-20, EIP-2612 permit, and Ownable implementations instead of a handwritten token.

Inheritance:

1. `Initializable`
2. `ContextUpgradeable`
3. `ERC20Upgradeable`
4. `EIP712Upgradeable`
5. `ERC20PermitUpgradeable`
6. `OwnableUpgradeable`
7. `TokenV2`

`ITokenV2` adds no storage. It exposes initialization, metadata, the recorded max supply, pool reads, the constraint flag, and the two custom events.

Token-specific storage, in declaration order:

| Variable | Purpose |
| --- | --- |
| `maxSupply` | Amount minted during `initialize` |
| `metaURI` | Metadata string stored on-chain |
| `uniswapV2Pool` | Configured V2 address |
| `uniswapV3Pool` | Configured V3 address |
| `_transferConstraints` | `1` while pool transfers revert, otherwise `0` |
| `__gap` | 45 reserved words for a later upgrade of this project |

The reference stored `transferConstraints` as a public `bool` packed beside the V2 address. This project uses a full `uint256` slot so a later variable is appended instead of being packed into an address. That is an intentional storage difference. This project does not claim it can replace the implementation behind the reference token at `0xc66223acbb96c9bd42f3913a57a379fde0bf8888`.

`@openzeppelin/hardhat-upgrades` validates the layout of this implementation for a transparent proxy. Passing that check is not an audit and does not prove compatibility with the reference deployment.

## Initialization

The implementation constructor calls `_disableInitializers()`. A direct call to `initialize` on the implementation reverts. That lock is stored in the implementation's own storage.

A proxy has separate storage. Deploying a proxy without initialization calldata leaves `initialize` callable by anyone. The deployment script refuses to do that. It passes the encoded `initialize` call as the transparent proxy constructor data, so initialization and deployment are the same transaction.

`initialize`:

1. Rejects a zero pool, a pool equal to the caller, a pool equal to the proxy, an empty name, symbol, or metadata URI, and a zero supply.
2. Initializes ERC-20, permit, and ownership. Ownership goes to `msg.sender`.
3. Stores the pools, supply, metadata, and the constraint flag.
4. Mints `maxSupply_` to `msg.sender`.

There is no second mint function. A second `initialize` reverts with `Initializable: contract is already initialized`.

Permit uses the token name and EIP-712 version `"1"`.

## Proxy model

The selected pattern is OpenZeppelin's transparent proxy from Contracts 4.9.6:

1. Deploy `TokenV2`. Its initializer is already disabled.
2. Deploy `ProxyAdmin`. The deployer owns it.
3. Deploy `TransparentUpgradeableProxy` with the implementation, the proxy admin, and the `initialize` calldata.

The ERC-1967 implementation and admin slots are checked after deployment. The token owner and the proxy admin owner start as the same wallet, but they are different roles:

- The token owner can transfer or renounce token ownership and can call `removeTransferConstraints`.
- The proxy admin owner can upgrade the implementation through `ProxyAdmin`.

`npm run proxy:upgrade:mainnet` is the upgrade command. It sends a transaction only after the current layout has been recorded and the compiled source has changed. The proxy admin's power exists whether or not that command is used.

`TokenV2` is not UUPS. The reference has no `_authorizeUpgrade` function, so a UUPS proxy would not match it.

## Transfer constraints

`_beforeTokenTransfer` runs for transfers, mints, and burns. While the flag is `1`, a transfer whose `from` or `to` equals either configured pool reverts. The owner is not exempt.

The V2 address is checked before the V3 address. If both settings contain the same address, the V2 revert is the one users see.

`removeTransferConstraints` is owner-only. It sets the flag to `0` and emits `TransferConstraintsRemoved`. Calling it again reverts. This implementation has no function that turns the flag back on.

Every ERC-20 transfer, mint, and burn still emits the standard `Transfer` event. `_afterTokenTransfer` also emits `TransferFlapToken(from, to, amount)` with neither address indexed, matching the reference event.

## Deployment flow

`scripts/deploy-token.ts` is the supported path. It validates configuration and chain id, asks for confirmation on public networks, validates storage layout, deploys the three contracts, checks state, and writes `deployments/<network>.json`.

`scripts/deploy-implementation.ts` and `scripts/deploy-proxy.ts` split that path for a persistent network. They are not usable on the in-process Hardhat network because that state disappears when the process exits.

## Decimals

`decimals()` is the OpenZeppelin default, 18. Deployment configuration must also say 18. The script will not scale the supply with another decimal value and then deploy a contract that still reports 18.
