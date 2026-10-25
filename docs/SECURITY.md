# Security

This repository has not been independently audited. Tests, compiler checks, and OpenZeppelin's upgrade validator are not a substitute for an audit. A verified source listing on BscScan is also not an audit.

Static analysis:

```bash
npm run security:check
```

That command runs Slither through Hardhat. It installs `slither-analyzer` 0.11.3 into `.venv` on the first run. Findings are filtered to the project contracts. OpenZeppelin sources under `node_modules` are dependencies, not the report target. A clean or noisy Slither run is still not an audit.

## Privileged roles

| Role | What it can do |
| --- | --- |
| Token owner | Remove pool transfer constraints once. Transfer or renounce ownership. |
| Proxy admin owner | Upgrade the proxy to a new implementation through `ProxyAdmin`. |
| Initializer | Becomes the token owner and receives the full initial supply. This happens inside the proxy constructor. |

The deployment scripts do not upgrade the token, remove constraints, transfer ownership, or renounce anything.

The proxy admin is the important residual risk. The current implementation has no mint function. A future implementation selected by the proxy admin could add one, change transfers, or block wallets. Do not describe the supply as permanently fixed unless the proxy admin's upgrade power has been removed through a deliberate, separate transaction such as transferring `ProxyAdmin` to a known timelock or renouncing that admin. Renouncing the proxy admin is irreversible and is not performed by these scripts.

Token-owner renunciation is also irreversible. If it happens while constraints are still enabled, nobody can disable them through this implementation.

## Transfer restrictions

Constraints start enabled. They are not hidden: `transferConstraints()` returns true, `pools()` returns the addresses, and transfers involving those addresses revert with:

- `Token: transfer to/from uniswap v2 pool is not allowed`
- `Token: transfer to/from uniswap v3 pool is not allowed`

The owner is subject to the same rules. There is no function that turns the constraints back on after removal. Removal emits `TransferConstraintsRemoved`.

Using this restriction to block sells while telling buyers the token trades freely would be deceptive. The deployment log states that pool transfers revert until the owner explicitly removes the constraints.

## Initialization

The reference constructor was empty. Anyone could have called `initialize` on a deployed implementation. This project calls `_disableInitializers()` in the implementation constructor.

That lock does not protect a proxy. Proxy storage starts uninitialized. The supported scripts encode `initialize` into the proxy constructor so there is no separate transaction an attacker can front-run. `test/deployment.test.ts` shows that a proxy deployed with empty calldata can be initialized by another account. Do not deploy the proxy that way.

## Permit

Permit follows OpenZeppelin ERC20PermitUpgradeable 4.9.x. The domain name is the token name, the version is `"1"`, and the chain id and verifying contract are part of the separator. Signatures are not authorizations to do anything except set an allowance. They can be front-run. A failed signature does not leave a spent nonce because the transaction reverts.

## Keys

- `.env` is gitignored.
- Scripts reject a private key that is not 32 bytes of hex and do not print the value.
- RPC failures are reported without the URL, because a URL may contain an access token.
- Do not commit `deployments/*.json` unless you have reviewed it. Those files are gitignored. They contain addresses and initialization calldata, not the private key.
- Use a dedicated deployment wallet. Do not keep a treasury in it.

## Dependencies

OpenZeppelin Contracts and Contracts Upgradeable are pinned to 4.9.6. The reference comments name files last updated in 4.9.0 and 4.9.4. 4.9.6 is the final 4.9 release and is the package that contains those contracts. Do not mix OpenZeppelin 5 into this project. Ownable's initializer in version 5 takes an owner argument and the ERC-20 hooks changed.

`package-lock.json` is the reproducible install record. Do not float versions with `^` in `package.json`.

`npm audit` reports vulnerabilities in Hardhat's transitive dependencies. They were not removed with `npm audit fix --force`, because that command upgrades packages outside the pinned set and can break the compiler and proxy tooling. Review audit output before a production deployment and upgrade only with a tested lockfile.

## Testing limits

The automated tests cover initialization, supply, transfers, allowances, constraints, permit, ownership, proxy setup, and configuration rejection. They run on the local Hardhat network. They do not:

- prove the configured addresses are real Uniswap pools
- execute a swap on a forked exchange
- prove a future upgrade is safe
- replace an external audit
- run unless `npm run test` was actually executed

Static analysis with Slither is optional and is not claimed unless a Slither report was produced in the current environment. When Slither is installed:

```bash
slither . --compile-force-framework hardhat
```

## Known issues

1. The proxy admin can change token behavior after deployment.
2. Pool constraints can block trading through the configured addresses until the owner removes them.
3. `maxSupply` is a stored value, not an active mint cap. There is no mint function in this implementation.
4. The reference deployment's factory and proxy addresses were not in the supplied source. This transparent-proxy path is an independent, tested deployment method, not a claim that it reproduces an unseen factory.
5. The exact `solc` patch used for the reference deployment was not in the supplied file. This project pins 0.8.19, optimizer 99999, London, `viaIR` false.
6. Metadata is only a URI. Off-chain content can change without a transaction.
7. No audit has been performed as part of this repository.

## Behaviors deliberately not included

Hidden minting, undisclosed blacklists, transfer taxes, stealth sell blocks, fake volume, fake liquidity locks, automatic liquidity, automatic renouncement, and private-key logging are not implemented. `liquidity:lock:mainnet` does not lock tokens inside this contract. It sends LP tokens to PinkLock and `liquidity:inspect:mainnet` reads that lock back.
