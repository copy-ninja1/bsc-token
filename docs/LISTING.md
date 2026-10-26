# List the token and its logo

Each site keeps its own record. A swap, a PancakeSwap pair, and the `image` field in `TOKEN_METADATA_URI` do not upload a logo. The contract stores the metadata link once. This implementation has no function that changes the name, the symbol, or that link.

Use the proxy address from `deployments/bsc.json` on every form. That file is local to the deployment machine. The implementation address holds no balances. A logo approved for an older proxy does not move to a new one.

`metadata/independent-token.json` is a sample off-chain metadata document for the default name and symbol. It is not uploaded by the contract. The on-chain value is the `TOKEN_METADATA_URI` chosen at initialization, and this implementation cannot change it later.

This token is an independent asset. The repository default is **Independent Token**, symbol **INDT**. The sample metadata file does not use Bitcoin's logo. Sites below reject a name, a symbol, or a logo that copies an established asset. The already deployed mainnet proxy still has the name and symbol it was initialized with, and this implementation has no way to change them. A different identity requires a new deployment, and that deployment needs its own pair before a chart exists. See [ADD-LIQUIDITY.md](ADD-LIQUIDITY.md).

Paying a review fee does not force an approval. A rejected or ignored submission leaves the generic placeholder in place.

## What each site shows without a listing

| Site | After deployment | After a pair and one trade | After its own logo review |
| --- | --- | --- | --- |
| Trust Wallet | Name, symbol, and balance only if the proxy is imported by hand | A chart can follow, often after DexScreener or GeckoTerminal already show a price | Logo in search |
| BscScan | Contract page. Name and symbol appear from the chain | The page still has no project logo until the token-update review | Logo, site, and description on the token page |
| DexScreener | Nothing until a pair exists | Pair and price. No project logo | Logo and links on the pair page |
| GeckoTerminal | Nothing until a pair exists | Pool and price. No project logo | Logo and links on the pool page |
| PancakeSwap | The proxy can be pasted in | A pair can be traded | A logo when Trust Wallet's asset list includes this proxy |

## Trust Wallet

Trust Wallet reads logos from [trustwallet/assets](https://github.com/trustwallet/assets). The folder for this chain is:

`blockchains/smartchain/assets/<checksum-proxy>/`

The folder name must be the checksum proxy. Two files go inside it:

| File | Restriction |
| --- | --- |
| `logo.png` | Lowercase name. PNG only. 256×256 recommended, at most 512×512, square, under 100 KB. The mark must fit a circle and stay readable on white and on black. Transparency belongs outside the mark. |
| `info.json` | `type` is `BEP20`. `id` is the same checksum address. `name`, `symbol`, and `decimals` match the contract. `decimals` is 18. Also include `description`, `website`, `explorer`, `status` of `active`, `links`, and `tags`. |

Open a pull request on that repository, or use the Assets web app linked from it. The merge bot requests a non-refundable fee of 500 TWT or 2.5 BNB. The fee is per pull request.

Published acceptance criteria, which still leave the decision to the maintainers:

- A live website and a white paper with a roadmap, tokenomics, and a use case
- Active social accounts and a responsive support contact
- A full audit by a firm they consider reputable
- A CoinMarketCap listing
- At least 10,000 holders and 15,000 transactions, excluding airdrops
- No copied name, symbol, or logo, including copies of Bitcoin and of stablecoins such as USDT, USDC, and DAI

Brand-new tokens are refused. Rules and the fee are documented at <https://developer.trustwallet.com/developer/new-asset/requirements> and <https://developer.trustwallet.com/developer/new-asset/pr-fee>.

After a merge, the phone apps cache images for several hours. Clearing the app cache is what shows a newly merged logo on that device.

## BscScan

BscScan does not take the logo from Trust Wallet or from the metadata JSON.

1. Publish the source. Put an Etherscan API key in `BSCSCAN_API_KEY`, then run `npm run verify:mainnet`. The steps are in [VERIFICATION.md](VERIFICATION.md). A failed verify command means the source is not public yet.
2. Sign in on BscScan.
3. Open the proxy page and choose **Update**. Prove control of the owner address by signing the message the form shows.
4. Submit once, through that form. The guide is <https://info.bscscan.com/how-to-update-token-info/>.

Restrictions they publish:

- The website has to load, describe the project, and match the contract you submit
- The contact email has to be on the project's own domain, or the address already shown on the site
- The logo is an SVG at 32×32, or a PNG at 64×64, on a public download link
- The description stays factual. Superlatives are a reason to reject the text
- The name, symbol, logo, and links must not be fraudulent, infringe copyright, or represent another project or a public entity
- One submission at a time. A second form for the same address waits behind the first
- The form cannot be edited after it is sent

The ordinary review is free and has no stated deadline. [Priority Support](https://bscscan.com/priority-support) shortens the response time. It does not guarantee that the logo is published.

## DexScreener

DexScreener adds a pair on its own after the pair exists and someone has traded it. That page has a price and no project logo.

Two ways a logo arrives later:

- CoinGecko lists the token. DexScreener copies that record, including the logo. See <https://docs.dexscreener.com/token-listing>.
- [Enhanced Token Info](https://marketplace.dexscreener.com/product/token-info) is paid. Most orders finish within minutes. The stated allowance is 12 hours.

The paid icon must be square, at least 100 pixels wide, in PNG, JPG, WEBP, or GIF, and at most 4.5 MB. A header image, when you send one, is 3:1 and at least 600 pixels wide, with the same formats and size cap.

## GeckoTerminal and CoinGecko

On the pool page, **Update Token Info** sends a logo and links to GeckoTerminal. Review is tied to GeckoTerminal Fast Pass, bought on the GeckoTerminal site. Other people selling a "guaranteed listing" are not CoinGecko. The product description is <https://support.coingecko.com/hc/en-us/articles/22612245806745-How-do-I-update-token-information-on-GeckoTerminal>.

They can reject a request that lacks enough information to show it is genuine, that contains wrong information, that was sent on the wrong form, or that duplicates an open request.

Once CoinGecko lists the token, GeckoTerminal stops taking logo edits. Later changes go through CoinGecko's own update form. A CoinGecko listing is a separate application. DexScreener and GeckoTerminal can both display the CoinGecko logo after that listing exists.

## CoinMarketCap

Trust Wallet's asset criteria ask for a CoinMarketCap page before they will consider a logo. CoinMarketCap runs that listing itself. It reviews the site, the contract, and whether the name and logo copy another asset. A CoinMarketCap page does not place the logo into Trust Wallet, BscScan, or DexScreener by itself.

## PancakeSwap

PancakeSwap can trade the proxy as soon as the pair exists. Its default token icon comes from the Trust Wallet asset list. There is no second logo upload in this repository. The Trust Wallet section above is the path for that icon.

## Order that matches the restrictions

1. Choose a name, a symbol, and a logo that are not Bitcoin's and not another live asset's. Do this before deployment. This rulebook cannot rename the token afterward.
2. Deploy, add a pair, and make one trade. Charts depend on that trade. Logos do not.
3. Verify the source on BscScan, then send one token-update form.
4. Send the DexScreener or GeckoTerminal info update for the pair page.
5. Apply to CoinGecko and CoinMarketCap when the project meets their volume and identity checks.
6. Open the Trust Wallet asset pull request only after those public records exist. The holder and transaction minimums are the last gate, not the first.
