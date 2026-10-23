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

- name `BTC Token`, symbol `BTC`, decimals `18`
- total supply and deployer balance equal to `1000000000000000000000000000`
- owner is the deployer
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

Removal does not add liquidity.

## Records

`deployments/<network>.json` stores the network, chain id, compiler settings, configuration, proxy, implementation, proxy admin, initialization calldata, and transaction hashes.

Do not treat a record as success if the script exited with an error. A failed run should not write the final file because the write happens after the state checks.

## Ownership transfer

There is no ownership-transfer script, so it cannot run accidentally. From the token owner, the contract method is `transferOwnership(newOwner)`. The new owner must be an address you control. `renounceOwnership()` sets the owner to the zero address and cannot be undone.

Proxy admin ownership is separate. It lives on the `ProxyAdmin` contract recorded in the deployment file. Changing it is an irreversible operational decision and is not automated here.
