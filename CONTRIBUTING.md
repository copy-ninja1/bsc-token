# Contributing

This repository is a Hardhat project for one upgradeable ERC-20 on BNB Smart Chain. Changes should keep the current token behavior unless a pull request says, in the description, that behavior, storage, or tokenomics will change.

## Setup

Node.js 22.21.1 and npm 10.9.4 match the versions this project was tested with. `.nvmrc` pins the Node version.

```bash
npm ci
cp .env.example .env
```

Leave `.env` empty for local tests. Public-network commands read `PRIVATE_KEY`, RPC URLs, and the token settings from that file. Never commit `.env`, a private key, a seed phrase, or an API key.

## Checks

```bash
npm run compile
npm run test
npm run typecheck
npm run lint
```

`npm test` is `hardhat test`. It uses the in-process Hardhat network. It does not deploy to BSC testnet or BSC mainnet and does not need a funded wallet.

`npm run security:check` runs Slither 0.11.3 from `requirements-dev.txt` inside `.venv`. A Slither report is not an audit. Python 3 is required for that command only.

## Conventions

- Keep Solidity contracts in `contracts/`. `TokenV2` is the token. `ITokenV2` is its interface. `contracts/imports/OpenZeppelinProxyImports.sol` exists so Hardhat emits proxy artifacts for verification. Do not deploy that file as the token.
- Keep compiler, network, and token settings in `config/`. Do not change the Solidity version, optimizer, EVM target, or OpenZeppelin version unless the pull request explains the compatibility impact.
- Put deployment and chain actions in `scripts/`. Share helpers through `scripts/lib/` instead of copying confirmation, network, and transaction logic.
- Put reusable test setup in `test/helpers/`. Tests should assert the behavior they claim, including expected reverts.
- Match the existing TypeScript style. `npm run lint` runs ESLint and Solhint. `npm run typecheck` runs `tsc --noEmit`.
- Mainnet scripts must keep their explicit confirmation flags. Do not make a test, a build, or CI send a mainnet transaction.
- Do not add minting, transfer taxes, blacklists, hidden pauses, or proxy changes unless the change is requested and documented.

## Pull requests

1. Branch from `main`.
2. Describe the behavior you changed and the behavior you left alone.
3. Run the checks above.
4. Do not include `artifacts/`, `cache/`, `coverage/`, `.env`, or `deployments/*.json`.

A pull request template is in `.github/PULL_REQUEST_TEMPLATE.md`.
