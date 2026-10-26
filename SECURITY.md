# Security policy

## Reporting a vulnerability

Report an undisclosed vulnerability in private. Do not open a public GitHub issue for it, and do not include a private key, a seed phrase, or an RPC URL that contains an access token.

After this repository is published, use GitHub private vulnerability reporting (Security, then Advisories). Until a maintainer contact is published, send the report to the repository owner through a private channel they already use.

Include:

- the affected contract, script, or commit
- the network, when the issue is live (BNB Smart Chain mainnet chain id 56, or testnet chain id 97)
- the impact
- a proof of concept that does not move funds and does not publish secrets

Allow time for a fix before any public write-up.

## Scope

The review surface is the Solidity in `contracts/`, the deployment and action scripts, and the way configuration is loaded from the environment.

Design limitations of the current token are written down in [docs/SECURITY.md](docs/SECURITY.md). Those notes are not an invitation to exploit a deployed token, and they are not an audit. This repository has not been independently audited. Passing tests and Slither do not prove the contracts are secure.

## Secrets

- Do not commit `.env`, private keys, or API keys. `.env.example` contains empty placeholders.
- `deployments/*.json` is gitignored. It holds addresses and initialization calldata from a local run.
- Deleting a secret from the working tree does not delete it from earlier commits. If a key was ever committed or pasted into an issue, move the funds and treat that key as public.

## Out of scope for a code report

Third-party sites, wallet applications, PancakeSwap, PinkLock, and BscScan are outside this repository. A report about those services should go to their own maintainers.
