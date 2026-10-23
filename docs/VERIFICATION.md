# Verification

Verification publishes source that compiles to the deployed bytecode. It does not audit the contract, freeze the proxy admin, or disable transfer constraints.

## What must match

Use the deployment record written by the deploy script:

- proxy address
- implementation address
- proxy admin address
- compiler 0.8.19
- optimizer enabled with 99999 runs
- EVM version london
- viaIR disabled
- OpenZeppelin 4.9.6

The implementation constructor has no arguments. The proxy admin constructor has no arguments. The proxy constructor arguments are:

1. implementation address
2. proxy admin address
3. `initializeData` from the deployment record

Those three values are not interchangeable. Verifying the implementation at the proxy address will fail, and the reverse will fail too.

## Command

Install and fill `BSCSCAN_API_KEY` with an Etherscan API key that can query BNB Smart Chain. BscScan's older standalone API has moved to Etherscan API v2. `hardhat.config.ts` points the custom chains at:

- `https://api.etherscan.io/v2/api?chainid=56`
- `https://api.etherscan.io/v2/api?chainid=97`

```bash
npm run verify:testnet
```

Mainnet, after a real deployment record exists:

```bash
npm run verify:mainnet
```

The script reads `deployments/<network>.json`, checks the chain id, and submits:

- `contracts/TokenV2.sol:TokenV2`
- `@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin`
- `@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy`

A non-zero exit means verification did not succeed. Do not report the contracts as verified in that case. The explorer response is the result.

The script refuses to run without `BSCSCAN_API_KEY` and refuses to run on the local Hardhat network.

## After a successful verification

On the proxy page, confirm:

- the logic contract link is the implementation address from the record
- `name`, `symbol`, `decimals`, and `totalSupply` match the record
- `owner` is the expected wallet
- `transferConstraints` is still true unless the removal script was run on purpose
- `pools` returns the configured addresses

The proxy admin page should show the deployer, or a later admin you transferred deliberately, as its owner.

## What verification does not mean

- It does not mean the token is Bitcoin or backed by Bitcoin.
- It does not mean a third party audited the code.
- It does not mean the proxy admin has given up upgrades.
- It does not mean the pool addresses are liquid markets.
- It does not mean constraints were removed.

If the explorer and the deployment record disagree, trust the transaction receipts and the record from the deployment that you actually ran. Do not paste an address from the reference token `0xc66223acbb96c9bd42f3913a57a379fde0bf8888` into this project's record. That address is the reference, not a deployment performed by these scripts.
