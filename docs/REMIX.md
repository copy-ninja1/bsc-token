# Remix

Remix can compile this project. Hardhat remains the deployment path that the tests execute. Deploying one Solidity file in Remix is not enough.

## 1. Open Remix

Use <https://remix.ethereum.org> or the Remix desktop app.

## 2. Load these files

The compiler needs:

- `contracts/TokenV2.sol`
- `contracts/interfaces/ITokenV2.sol`
- `contracts/imports/OpenZeppelinProxyImports.sol`
- `@openzeppelin/contracts-upgradeable` **4.9.6**
- `@openzeppelin/contracts` **4.9.6**

The reliable way to keep the same imports is Remixd from this repository:

```bash
npx --yes @remix-project/remixd -s . --remix-ide https://remix.ethereum.org
```

Connect the workspace in Remix's file explorer. Remixd serves the local `node_modules` tree, so the npm imports resolve.

Copying only `TokenV2.sol` into Remix will fail. The OpenZeppelin files are dependencies, not optional comments.

## 3. Compiler

In Solidity Compiler:

| Setting | Value |
| --- | --- |
| Compiler | 0.8.19 |
| Optimizer | enabled |
| Runs | 99999 |
| EVM version | london |
| viaIR | off |

These match `hardhat.config.ts`. A different compiler, run count, or EVM version produces different bytecode and will not verify against a Hardhat deployment.

## 4. Wallet and network

Connect MetaMask with the dedicated deployment account.

BNB Chain parameters, from the BNB Chain wallet configuration document:

| Network | RPC | Chain id | Symbol | Explorer |
| --- | --- | --- | --- | --- |
| BSC Testnet | `https://data-seed-prebsc-1-s1.bnbchain.org:8545` | 97 | tBNB | `https://testnet.bscscan.com` |
| BSC Mainnet | `https://bsc-dataseed.bnbchain.org` | 56 | BNB | `https://bscscan.com` |

Confirm the chain id in MetaMask before a transaction. Remix will not ask for `CONFIRM_MAINNET_DEPLOYMENT`.

## 5. Do not stop at the implementation

`TokenV2` is the logic contract. Its constructor disables initializers. If you deploy only `TokenV2` and give that address to users:

- `initialize` reverts
- total supply stays 0
- there is no owner

That address is not the token.

## 6. Deploy the proxy

Prefer `npm run deploy:testnet` or `npm run deploy:local`.

A manual Remix sequence has to repeat what `scripts/lib/deployToken.ts` does:

1. Deploy `TokenV2`. It has no constructor arguments.
2. Deploy `ProxyAdmin` from `@openzeppelin/contracts` 4.9.6. It has no constructor arguments. The wallet that deploys it owns the admin.
3. Encode `initialize(v2Pool, v3Pool, name, symbol, metaURI, maxSupply)`.
   - `maxSupply` for the default configuration is `1000000000000000000000000000`
   - neither pool may be the zero address, the deploying wallet, or the proxy address
4. Deploy `TransparentUpgradeableProxy` with:
   - logic: the `TokenV2` address
   - admin: the `ProxyAdmin` address, not the wallet
   - data: the encoded `initialize` call

The admin must be the `ProxyAdmin` contract. If the admin is the deployer wallet, that wallet's calls are intercepted by the proxy and it cannot use the token normally.

If `_data` is empty, the proxy is uninitialized and any account can call `initialize`, take ownership, and receive the supply. The Hardhat tests demonstrate that failure mode.

## 7. Check the proxy, not the implementation

Load the proxy address with the `TokenV2` ABI and call:

- `name`, `symbol`, `decimals`
- `totalSupply` and `balanceOf` on the deployer
- `owner`
- `metaURI`
- `pools`
- `transferConstraints` — this must be `true` immediately after initialization

Also call the same reads on the implementation address. Supply and owner there must both be zero.

## 8. Compare with Hardhat

Compile with Hardhat and compare:

- compiler 0.8.19
- optimizer on, 99999 runs
- EVM london
- viaIR off
- OpenZeppelin 4.9.6

Remix metadata will not match Hardhat bytecode if any of those differ. Verify the Hardhat deployment with the Hardhat artifacts, not with a Remix rebuild that used different settings.
