# Tokenomics

## Identity

| Item | Value |
| --- | --- |
| Default name | BTC Token |
| Default symbol | BTC |
| Decimals | 18 |
| Initial supply | 1,000,000,000 tokens |
| Base units | 1000000000000000000000000000 |
| Chain | BNB Smart Chain, when deployed there |

The name and symbol are deployment settings. Whatever symbol is chosen, this contract does not become official Bitcoin, a Binance-issued asset, or a Bitcoin-backed asset. Nothing in the contract holds BTC, WBTC, or BNB as collateral.

## Supply

The entire initial supply is minted once, during `initialize`, to the wallet that submits that call. The deployment wallet, the owner, and the supply recipient are therefore the same address. The deployment script rejects a configuration that claims otherwise.

`maxSupply` stores that minted amount. It is not a cap enforced by a later mint, because this implementation does not have a later mint. Ordinary transfers move balances and do not change `totalSupply`.

The proxy admin can upgrade the implementation. An upgrade could add new behavior, including minting. Treat the fixed supply as a property of this implementation, not as a guarantee that the proxy admin has given up upgrade power.

There is no burn function in the public ABI. There is no tax, reflection, or fee on transfer.

## Ownership

The initializer is the token owner. The owner can:

- call `removeTransferConstraints` once
- transfer ownership
- renounce ownership

Renouncing ownership sets the owner to the zero address. That is irreversible. Owner-only functions, including removal of transfer constraints, stop working. If constraints are still enabled at that moment, they stay enabled.

No script in this repository transfers or renounces ownership automatically.

## Metadata

`metaURI` is a string stored in contract storage. It is set once in `initialize`. This implementation has no metadata setter.

The string can point at off-chain JSON. Changing an off-chain document at that URI changes what a client may display. It does not change the contract address, balances, or bytecode. The deployment script accepts only `https://` and `ipfs://` values. The contract itself checks that the string is non-empty, so a manual Remix call can store a different non-empty string.

## Transfer constraints

At the end of initialization the constraint flag is on.

These transfers revert while the flag is on:

- to the configured V2 address
- from the configured V2 address
- to the configured V3 address
- from the configured V3 address

Other wallet-to-wallet transfers succeed, including transfers of the full balance and transfers of zero value.

The configured addresses are whatever the deployer supplied. This project does not prove they are Uniswap or PancakeSwap pools. The reference interface describes them as predicted pool addresses, so they may have no code at deployment time. Transfers involving those addresses still revert while the flag is on.

This restriction can stop buys and sells that require a transfer to or from those addresses. The token must not be described as freely tradable through those pools while the flag is on. Turning the flag off does not add liquidity, open a pair, or make a router succeed.

The owner cannot bypass the restriction. There is no blacklist, whitelist, or hidden sell toggle beyond this disclosed pool check.

## What the token does not do

- It does not represent Bitcoin.
- It does not custody or redeem Bitcoin.
- It does not mint after initialization in this implementation.
- It does not take a transfer fee.
- It does not add or lock liquidity.
- It does not verify itself or audit itself.
