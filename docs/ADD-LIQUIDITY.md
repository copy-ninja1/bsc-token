# Add liquidity

Trust Wallet shows **No data right now** until a public market exists for this contract. The token contract does not publish a price. PancakeSwap does, after a wallet deposits this token and another asset into a pair and someone trades it.

The token contract cannot deposit liquidity by itself. `npm run liquidity:add:mainnet` sends the PancakeSwap transactions from the wallet in `PRIVATE_KEY`. You do not need to redeploy. A second deployment creates a different contract, and Trust Wallet still has nothing to chart until that new contract has its own pair.

The add-liquidity command does not lock or burn the liquidity-provider tokens. They stay in the signer wallet, so that wallet can withdraw the deposit later. A separate `liquidity:lock:mainnet` command can send those LP tokens to PinkLock. The token contract does not record or enforce that lock.

This token is an independent asset. The default symbol **INDT** does not make the pair Bitcoin's market, and it does not display Bitcoin's chart. The chart, when it appears, is the price of this contract against the asset you deposit with it.

## The pair

Use the token you already deployed. The mainnet record is `deployments/bsc.json`. That file is gitignored and stays on the machine that deployed. Read the proxy from it, or from `npm run inspect:mainnet`. Do not paste the implementation address. The implementation holds no balances. Users, Trust Wallet, and PancakeSwap must use the proxy.

| Side | What it is |
| --- | --- |
| This token | The proxy address in `deployments/bsc.json`. This is the address a wallet must import. |
| Quote asset | Binance-Peg BTCB by default. Symbol **BTCB**. Address `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c`. |

BTCB is not part of this repository. BNB Chain publishes that address as the official BTCB contract on BNB Smart Chain. Confirm it on BscScan before you approve anything: <https://bscscan.com/token/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c>.

Native Bitcoin on the Bitcoin network cannot be deposited into a BNB Smart Chain pair. PancakeSwap can only take BEP-20 tokens. BTCB is the default quote asset. Set `QUOTE_TOKEN` only when you intend a different quote asset.

The entire supply was minted to the deployment wallet. That wallet has to be the `PRIVATE_KEY` signer, or the tokens and the quote asset have to be moved to the wallet that runs the command.

If you deploy again, `deployments/bsc.json` gets a new proxy. Use that new proxy everywhere below. The BTCB address stays the same unless you set `QUOTE_TOKEN`.

## Command

From this repository, with `.env` filled for mainnet:

```bash
CONFIRM_MAINNET_DEPLOYMENT=true \
CONFIRM_ADD_LIQUIDITY=true \
LIQUIDITY_TOKEN_AMOUNT=1000000 \
LIQUIDITY_QUOTE_AMOUNT=0.001 \
npm run liquidity:add:mainnet
```

Replace both amounts. `1000000` and `0.001` are an example of the ratio, not a recommended deposit. `0.001` BTCB is one-thousandth of a Binance-Peg bitcoin. The command prints the amounts and the predicted pair, then waits for you to type `ADD`. In a non-interactive shell, set `DEPLOY_CONFIRMATION=ADD` as well.

`LIQUIDITY_SLIPPAGE_BPS` defaults to `100` (1 percent) and cannot be higher than `1000`. Leave `QUOTE_TOKEN` empty to use BTCB. Set `TOKEN_ADDRESS` only when the proxy is not the one in `deployments/bsc.json`.

The command checks the signer balances, refuses the implementation address, and refuses the deposit when the predicted pair is one of the two constrained pool addresses. It then approves the PancakeSwap V2 router and calls `addLiquidity`. A successful run appends the pair and the transaction hash to `deployments/bsc.liquidity.json`.

The website steps below do the same deposit by hand. Use those when you want to sign in the browser instead of with `PRIVATE_KEY`.

## What the wallet needs

On BNB Smart Chain, chain id **56**, the wallet needs all three:

| Asset | Why |
| --- | --- |
| This token | One side of the pair. Import the proxy if the wallet does not list it yet. |
| BTCB | The other side. This is what gives the token a price. |
| BNB | Gas for the approval and the supply transaction. A small amount is enough. |

Depositing only this token does not create a price. Both sides have to go in.

## Transfer constraints

Constraints start enabled. They block transfers only to or from the two pool addresses stored in the contract. Read them with `npm run inspect:mainnet`. They are also stored in `deployments/bsc.json` as `v2PoolAddress` and `v3PoolAddress`.

A new PancakeSwap pair receives its own address. The add-liquidity command refuses to continue when that predicted pair is one of the two constrained addresses. A pair that is neither of those addresses can receive liquidity while the flag stays on. You do not turn the flag off for this step.

Turning the flag off is permanent for this implementation and still does not create a pair. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Add the liquidity in the browser

1. Open the wallet that holds this token. Switch the network to BNB Smart Chain.
2. Open PancakeSwap and choose **Add Liquidity**.
3. Connect that wallet. Paste the proxy as the first token and select BTCB as the second. Reject any other contract that offers the symbol BTCB, or that copies this token's name.
4. Enter an amount on both sides. The ratio is the opening price of this token in BTCB. Example: depositing 1,000,000 of this token and 1 BTCB opens the market at 0.000001 BTCB per token. Choose amounts you are willing to leave in the pool.
5. Approve this token. Approve BTCB. Then confirm **Supply**. The first supply creates the pair. Later supplies only add to it.

The site will ask the wallet to approve spending and then to send the supply transaction. Read the token addresses in the wallet prompt before you confirm. Those transactions move the deposited amounts out of the wallet and into the pair. The wallet receives liquidity-provider tokens for that pair. Whoever holds those liquidity-provider tokens can withdraw the deposited assets later. This guide does not lock them.

## Swap and withdraw

After the pair exists, one swap prints a trade:

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_SWAP=true \
SWAP_BTCB_AMOUNT=0.0001 \
npm run swap:mainnet
```

`SWAP_TOKEN_AMOUNT` swaps this token for BTCB instead. Set only one of the two amounts. The command refuses to run when the pair has no reserves.

To take the deposit back out:

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_REMOVE_LIQUIDITY=true \
npm run liquidity:remove:mainnet
```

Leave `LIQUIDITY_LP_AMOUNT` empty to withdraw the signer's whole LP balance. The token and BTCB return to that wallet.

To send those LP tokens to PinkLock instead of keeping them in the wallet:

```bash
CONFIRM_MAINNET_DEPLOYMENT=true CONFIRM_LOCK_LIQUIDITY=true \
LOCK_DAYS=180 \
npm run liquidity:lock:mainnet
```

PinkLock holds the LP tokens until the unlock date. The signer remains the lock owner and can withdraw from PinkLock after that date. This token contract does not record or enforce the lock. Check the result with `npm run liquidity:inspect:mainnet`.

## Print a trade

Indexers ignore a pair that nobody has traded. After the supply confirms, swap a small amount of BTCB for this token, or the other way around, on PancakeSwap. Set BTCB and the proxy as the two currencies. One real swap is enough to give the pair a traded price.

## Where the price shows up

Check DexScreener, GeckoTerminal, and the BscScan token page for the proxy address. They usually update before Trust Wallet.

When those sites show a price, Trust Wallet can follow. That often takes minutes and sometimes longer. Trust Wallet reads its own feed. Nothing in this contract refreshes that screen. The green **Buy** button only finds a route after the pair exists. Until then it stays on screen and does not complete a purchase.

A logo, a BscScan verification, and a CoinGecko listing are separate. None of them creates the chart.

## If you deploy a different token

Repeat this guide with the new proxy from `deployments/bsc.json`. Keep the same BTCB address. Import the new proxy in Trust Wallet. The old proxy keeps its own pair, if it has one, and does not move over.
