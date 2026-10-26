# Reference compatibility

Reference token listed by the request:

`0xc66223acbb96c9bd42f3913a57a379fde0bf8888`

Explorer link supplied with the request:

<https://bscscan.com/token/0xc66223acbb96c9bd42f3913a57a379fde0bf8888>

The behavior below was taken from the supplied flattened reference. A public source query without an API key did not return that contract's verified metadata, compiler patch, proxy address, or factory address. Those values are not invented here. This project does not claim the new token is that deployment or that it can be upgraded in place.

## What the supplied file contains

`TokenV2` and `ITokenV2`, plus a flatten of OpenZeppelin upgradeable contracts. File headers identify ERC-20 and Ownable at 4.9.0, permit at 4.9.4, and supporting libraries from 4.4.1 through 4.9.4. The trailing compiler JSON enables the optimizer for 99999 runs, sets `evmVersion` to `london`, and disables `viaIR`. The JSON in the file is missing a comma after `true`; the intended settings are still unambiguous. No `solc` patch is recorded.

The Foundry remappings mention Uniswap, PancakeSwap, forge-std, and both OpenZeppelin packages. Those library trees were not in the workspace. No factory, proxy, or deployment transaction was included.

`initialize(v2Pool, v3Pool, name, symbol, meta, maxSupply)`:

- calls `__ERC20_init`, `__ERC20Permit_init`, and `__Ownable_init`
- stores the pools, `maxSupply`, and `metaURI`
- sets `transferConstraints` to true
- mints `maxSupply` to `msg.sender`

Ownership therefore belongs to the initialize caller. OpenZeppelin 4.9 `__Ownable_init()` does not take a separate owner argument. The mint recipient is the same caller. There is no public mint.

`_beforeTokenTransfer` reverts when constraints are on and `from` or `to` is either stored pool. `_afterTokenTransfer` emits `TransferFlapToken` in addition to the ERC-20 `Transfer` event. `removeTransferConstraints` is `onlyOwner` and sets the flag to false, without an event and without a way to set it back to true. `pools()` returns the two addresses. `decimals()` is 18. Permit is OpenZeppelin's EIP-2612 implementation with domain version `"1"`.

The reference constructor is empty. It does not call `_disableInitializers()`.

## Reproduced behavior

- ERC-20 `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `transfer`, `approve`, `allowance`, `transferFrom`
- OpenZeppelin 4.9 `increaseAllowance` and `decreaseAllowance`
- EIP-2612 `permit`, `nonces`, and `DOMAIN_SEPARATOR`
- One mint, during initialization, to the caller
- Owner is that caller
- No public mint
- Constraints start enabled
- The same V2 and V3 revert strings
- Owner is not exempt from the pool check
- `pools()`, `maxSupply()`, and `metaURI()`
- `TransferFlapToken` on transfers, mints, and burns, without indexed addresses
- Standard `Transfer` is still emitted
- `removeTransferConstraints` is owner-only and cannot be turned back on by this contract
- Upgradeable parent contracts and an `initialize` function, deployed through a transparent proxy because the source is an initializer contract and not a UUPS contract

## Intentional differences

| Topic | Reference | This project |
| --- | --- | --- |
| Implementation constructor | Empty | Calls `_disableInitializers()` |
| Zero pool address | Mint later reverts with the pool-transfer string, because `address(0)` matches the pool during `_mint` | `initialize` reverts first with `Token: v2 pool is the zero address` or the V3 equivalent |
| Pool equal to the initializer or the proxy | Can fail inside the mint hook or block later transfers | Rejected with an explicit reason |
| Constraint removal | Sets the flag to false again if called twice, no event | Reverts if already removed and emits `TransferConstraintsRemoved` |
| Constraint storage | Public `bool` packed with the V2 address | Full `uint256` slot plus a 45-word gap |
| Imports | Foundry remapping | `@openzeppelin/contracts-upgradeable@4.9.6` |
| Compiler | `^0.8.13`, patch unknown | `0.8.19` pinned, London, 99999 runs |
| Deployment | Not included | Transparent proxy, `ProxyAdmin`, atomic `initialize` |
| Metadata checks | Any string, including empty | Contract rejects empty. The script also requires `https://` or `ipfs://` and at most 512 characters |

The constructor lock, zero-address checks, removal event, and atomic proxy initialization are deliberate. They are not claimed to be bytecode-identical to the reference.

## Unresolved from the supplied source

- The factory, if one existed, and its address
- The proxy type actually used for `0xc66223acbb96c9bd42f3913a57a379fde0bf8888`
- The original initializer arguments: name, symbol, pools, metadata, and supply of that deployment
- The original owner and whether ownership or the proxy admin was transferred
- The `solc` patch and whether the verified bytecode used the same 99999 runs
- Whether a later upgrade changed the reference implementation after this flatten was produced

Until those are known, the honest statement is: this repository reproduces the token behavior visible in the supplied `TokenV2` source, with the security differences above, and deploys it with OpenZeppelin's transparent proxy. It is a new token.

## Supply field

`maxSupply` in the reference is the amount passed to `_mint`. Nothing in the supplied contract mints again or checks `maxSupply` on transfer. This project keeps that meaning. The field is not described as an active cap enforced by a minter, because there is no minter.

## Trading

The reference blocks the configured pools at initialization. This project does too, and the scripts say so before a public deployment. Removing the block is a separate confirmed transaction. Neither version makes a pool exist by storing its address.
