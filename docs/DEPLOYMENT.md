# Deployment

Hardhat is the supported deployment path. Remix instructions are in [REMIX.md](REMIX.md). No command below sends a transaction until its safety checks pass. Local deployment is the exception: it uses the in-process Hardhat network and does not ask for a phrase.

## Checklist

- [ ] Node.js 22.21.1 and a clean `npm install`
- [ ] `npm run compile`, `npm run test`, `npm run typecheck`, and `npm run lint` succeeded
- [ ] The token name and symbol are understood to be independent of Bitcoin
- [ ] The deployment wallet is dedicated and holds only the needed BNB
- [ ] `INITIAL_OWNER` and `INITIAL_SUPPLY_RECIPIENT` are that wallet
- [ ] Pool addresses were chosen deliberately and written into `.env`
- [ ] The team accepts that constraints start enabled
- [ ] Mainnet still has `CONFIRM_MAINNET_DEPLOYMENT=false` until a person is ready

## Local

```bash
npm install
npm run compile
npm run test
npm run deploy:local
```

Expected checks inside that process:

- name `Independent Token`, symbol `INDT`, decimals `18`, unless `.env` sets another name, symbol, or supply
- total supply and deployer balance equal to `1000000000000000000000000000` when `TOKEN_INITIAL_SUPPLY` is unset or `1000000000`
- owner is the connected Hardhat account

Owner, recipient, pool, and metadata values in `.env` are not used for this local run. They apply on BSC testnet and mainnet. The printed pool addresses are Hardhat accounts.
- constraints are enabled
- implementation supply and owner are zero
- proxy admin and implementation slots match the deployed contracts

A second local run stops if `deployments/hardhat.json` already exists. Set `ALLOW_REDEPLOY=true` only to overwrite that record.

Persistent node:

```bash
npx hardhat node
npm run deploy:localhost
npm run inspect:localhost
```

## BSC testnet

Chain id **97**. Official public RPC from the BNB Chain JSON-RPC page:

`https://bsc-testnet-dataseed.bnbchain.org`

Explorer: `https://testnet.bscscan.com`

The wallet configuration page also lists `https://data-seed-prebsc-1-s1.bnbchain.org:8545`.

`.env` must include:

- `PRIVATE_KEY`
- `BSC_TESTNET_RPC_URL`
- `TOKEN_METADATA_URI` as `https://` or `ipfs://`
- `INITIAL_OWNER` and `INITIAL_SUPPLY_RECIPIENT`, both equal to the private key's address
- `UNISWAP_V2_POOL_ADDRESS` and `UNISWAP_V3_POOL_ADDRESS`
- `CONFIRM_TESTNET_DEPLOYMENT=true`

Then:

```bash
npm run deploy:testnet
```

The script checks chain id 97, requests a block number, prints the full configuration, estimates implementation gas, and requires the deployer balance to cover at least three times that estimate. Proxy deployment costs more than the implementation alone; the multiplier is a lower-bound safety check, not a precise total.

Type `DEPLOY` at the prompt. For a non-interactive shell, also set `DEPLOY_CONFIRMATION=DEPLOY`.

The script then deploys, waits for receipts, checks token state, and writes `deployments/bscTestnet.json`. It prints explorer links from the addresses it deployed. It does not invent a transaction hash.

Split path, only after you intend to operate the proxy yourself:

```bash
npx hardhat run scripts/deploy-implementation.ts --network bscTestnet
npx hardhat run scripts/deploy-proxy.ts --network bscTestnet
```

Prefer `npm run deploy:testnet`. The all-in-one script is harder to leave uninitialized.

## BSC mainnet

Chain id **56**. Official public RPC:

`https://bsc-dataseed.bnbchain.org`

Explorer: `https://bscscan.com`

Before any mainnet transaction the script requires all of the following:

- `CONFIRM_MAINNET_DEPLOYMENT=true`
- `BSC_MAINNET_RPC_URL`
- connected chain id 56
- a complete token configuration
- a gas estimate and a balance check
- the confirmation phrase `DEPLOY`

```bash
npm run deploy:mainnet
```

Read the printed block before typing the phrase. It shows the supply, recipient, pool addresses, and the fact that those pools cannot transfer the token until a later, separate removal. Abort by entering anything other than `DEPLOY`.

The script will not remove constraints or transfer ownership afterward.

## Remove constraints

This is permanent for this implementation.

```bash
CONFIRM_REMOVE_CONSTRAINTS=true npm run constraints:remove:testnet
```

Mainnet also needs `CONFIRM_MAINNET_DEPLOYMENT=true`. The prompt phrase is `REMOVE`. Non-interactive use sets `DEPLOY_CONFIRMATION=REMOVE`.

Removal does not add liquidity. Adding a PancakeSwap pair is a separate confirmed command. See [ADD-LIQUIDITY.md](ADD-LIQUIDITY.md).

## Records

`deployments/<network>.json` stores the network, chain id, compiler settings, configuration, proxy, implementation, proxy admin, initialization calldata, and transaction hashes.

Do not treat a record as success if the script exited with an error. A failed run should not write the final file because the write happens after the state checks.

## Other mainnet commands

Each command below runs only on BNB Smart Chain mainnet. It requires `CONFIRM_MAINNET_DEPLOYMENT=true`, its own confirmation flag, and the phrase shown. A non-interactive shell also sets `DEPLOY_CONFIRMATION` to that phrase. The signer is `PRIVATE_KEY`. `TOKEN_ADDRESS` overrides the proxy in `deployments/bsc.json`. Leave it empty to use that record.

| Command | Flag | Phrase | What it does |
| --- | --- | --- | --- |
| `npm run liquidity:add:mainnet` | `CONFIRM_ADD_LIQUIDITY` | `ADD` | Deposits the token and BTCB. See [ADD-LIQUIDITY.md](ADD-LIQUIDITY.md). |
| `npm run liquidity:remove:mainnet` | `CONFIRM_REMOVE_LIQUIDITY` | `REMOVE_LIQUIDITY` | Returns the signer's deposit. Set `LIQUIDITY_LP_AMOUNT` or leave it empty to withdraw all LP tokens. |
| `npm run swap:mainnet` | `CONFIRM_SWAP` | `SWAP` | One swap. Set `SWAP_QUOTE_AMOUNT` or `SWAP_BTCB_AMOUNT` to spend BTCB, or `SWAP_TOKEN_AMOUNT` to spend the token. |
| `npm run token:transfer:mainnet` | `CONFIRM_TRANSFER` | `TRANSFER` | Sends `TRANSFER_AMOUNT` of the token to `TRANSFER_TO`. |
| `npm run ownership:transfer:mainnet` | `CONFIRM_TRANSFER_OWNERSHIP` | `TRANSFER_OWNERSHIP` | Sets the token owner to `NEW_OWNER`. The new owner must be a wallet you control. |
| `npm run ownership:renounce:mainnet` | `CONFIRM_RENOUNCE_OWNERSHIP` | `RENOUNCE` | Sets the token owner to the zero address. This cannot be undone. |
| `npm run proxy:upgrade:mainnet` | `CONFIRM_UPGRADE` | `UPGRADE` | Points the proxy at the compiled `TokenV2`. The signer must own the proxy admin. |
| `npm run balance:mainnet` | | | Prints `BALANCE_ACCOUNT` or the signer's token and BNB balances. No transaction. |
| `npm run supply:mainnet` | | | Prints the current supply and the supply minted at initialization. No transaction. |
| `npm run allowance:mainnet` | | | Prints the allowance from `ALLOWANCE_OWNER` to `SPENDER`. No transaction. |
| `npm run approval:revoke:mainnet` | `CONFIRM_REVOKE_APPROVAL` | `REVOKE` | Sets the signer's allowance for `SPENDER` to zero. |
| `npm run liquidity:inspect:mainnet` | | | Reads PinkLock for this pair. No transaction. |
| `npm run liquidity:lock:mainnet` | `CONFIRM_LOCK_LIQUIDITY` | `LOCK` | Sends LP tokens to PinkLock until `LOCK_DAYS` or `LOCK_UNLOCK_AT`. |
| `npm run token:burn:mainnet` | `CONFIRM_BURN` | `BURN` | Burns the signer's tokens only when the implementation has `burn(uint256)`. |
| `npm run pause:mainnet` | `CONFIRM_PAUSE` | `PAUSE` | Pauses transfers only when the implementation has `pause()`. |
| `npm run unpause:mainnet` | `CONFIRM_UNPAUSE` | `UNPAUSE` | Resumes transfers only when the implementation has `unpause()`. |

`LIQUIDITY_SLIPPAGE_BPS` applies to adding liquidity, removing it, and swapping. It defaults to 100 (1 percent).

Renouncing ownership while transfer constraints are still on leaves those constraints on forever. Proxy admin ownership does not move when the token owner changes, and it does not disappear when the token owner renounces.

The first `proxy:upgrade:mainnet` run, while the source still matches the chain, records the storage layout and does not send a transaction. A later run, after `TokenV2` has changed, deploys the new implementation and upgrades the proxy. Balances and ownership stay on the proxy.

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_SWAP=true \
SWAP_BTCB_AMOUNT=0.0001 \
npm run swap:mainnet
```

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_REMOVE_LIQUIDITY=true \
npm run liquidity:remove:mainnet
```

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_TRANSFER=true \
TRANSFER_TO=<wallet-that-should-receive-the-tokens> \
TRANSFER_AMOUNT=1000 \
npm run token:transfer:mainnet
```

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_TRANSFER_OWNERSHIP=true \
NEW_OWNER=<wallet-that-should-own-the-token> \
npm run ownership:transfer:mainnet
```

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_RENOUNCE_OWNERSHIP=true \
npm run ownership:renounce:mainnet
```

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_UPGRADE=true \
npm run proxy:upgrade:mainnet
```

Replace `<wallet-that-should-receive-the-tokens>` and `<wallet-that-should-own-the-token>` with addresses you control before running those two commands.
