# Deploy the token yourself

This guide is for the person who will own the token. You do not need to know how to program. You do need to follow the steps in order, on your own computer, with a wallet that only you can open.

The code is public here:

<https://github.com/copy-ninja1/bsc-token>

Publishing that code does not create a token. BNB Smart Chain creates the token only when a wallet pays the network fee and the network accepts the transaction. That transaction has to be signed by the wallet's private key. The steps below are how you sign it yourself.

Read [Why this has to be you](#why-this-has-to-be-you) before you install anything. Then do the practice run on your own computer before you spend real BNB.

## Why this has to be you

### The code on GitHub is the recipe

The repository holds the program, the tests, and the command that sends the deployment. It does not hold a live token, and it does not hold a wallet. Anyone can read the recipe. Only a wallet can bake it onto BNB Smart Chain.

A developer can explain an error message. A developer cannot press the final button for you and leave you as the owner, because the button is your private key.

### The private key is the wallet

A wallet has two different things:

| What you see | What it is | Where it goes |
| --- | --- | --- |
| Address, starting with `0x` | Your public account number. Safe to copy into a faucet, into `.env` as `INITIAL_OWNER`, and into a message to someone helping you. | Forms, BscScan, chat |
| Private key, one long line of letters and numbers | The secret that can move everything in that wallet. | Only the `PRIVATE_KEY=` line in the `.env` file on your computer |
| Secret recovery phrase, 12 or 24 words | A backup that can recreate the private key. | Paper, stored offline. It never goes in `.env`. |

Anyone who has the private key can send the BNB, send the tokens, and operate the owner functions. There is no view-only copy of a private key. Showing it to someone, emailing it, putting it in a chat, or putting it in a screenshot gives that person the same power you have.

The same is true of the 12 or 24 word phrase. That phrase is enough to recreate the key later, even after you think the conversation is over.

Keep both of these on your machine and on paper you control:

- the private key
- the secret recovery phrase
- the file named `.env` after you have pasted the key into it
- a photo of any of those

A real help request can include the public address, the text of an error, and the three public contract addresses the script prints. It cannot include the key.

### The wallet that sends the transaction receives the token

This contract gives the entire supply to the wallet that deploys it, and it makes that same wallet the owner. With the default settings, that is 1,000,000,000 tokens. The command checks this on purpose. If `INITIAL_OWNER` or `INITIAL_SUPPLY_RECIPIENT` is any address other than the wallet behind `PRIVATE_KEY`, the command stops and deploys nothing.

So if another person runs the command with their own wallet, the tokens are created in their wallet. If they run it with your key, they had your key.

Sending the tokens to you afterward does not undo that. A person who has already seen the key can keep a copy. Moving the tokens also leaves behind a second, separate control called the proxy admin, described next.

### The same wallet holds the upgrade switch

The command creates three contracts. You pay a network fee three times. You care about all three addresses, and you save all three.

| Address the script prints | Everyday meaning |
| --- | --- |
| Proxy | This is the token. Wallets, BscScan, and other people use this address. The balance lives here. |
| Implementation | This is the current rulebook. Its own token balance stays at zero. Adding this address in a wallet shows a balance of zero. |
| Proxy admin | This is the upgrade switch. The wallet that deployed it can later point the proxy at a different rulebook. |

The current rulebook has no button that creates more tokens. A later rulebook, chosen with the proxy admin, could change how transfers work. The supply is fixed only for as long as that upgrade switch stays unused. The deployment command does not give the switch away, and it does not destroy it. Your deployment wallet keeps it.

That is another reason the deployment wallet has to be yours from the first transaction. Handing someone the key hands them the tokens and the switch together.

### What another person can still help with

Someone else can sit with you, read this guide, and look at an error message after you have checked that the message does not contain the private key. They can also help you choose the two pool addresses, as long as they only receive those public addresses and your public wallet address.

They should not remote-control the computer while `.env` is on it, and they should not ask you to export the key "so they can deploy it tonight."

## What you are creating

Default settings, which you can change before you deploy:

| Setting | Default | Can you change it later? |
| --- | --- | --- |
| Name | BTC Token | No. Choose it before mainnet. |
| Symbol | BTC | No. The symbol is a label. This token is not Bitcoin, it is not issued by Binance, and it is not backed by Bitcoin. |
| Decimals | 18 | No. The contract always uses 18. |
| Supply | 1,000,000,000 whole tokens | No extra mint in this rulebook. All of them are created in your deployment wallet. |
| Owner | Your deployment wallet | Only if you later choose to transfer ownership. This guide does not do that. |

The name and symbol are typed into `.env` before the command. After the proxy is deployed, this rulebook has no rename button.

Deployment does not put the token on an exchange. It does not add trading liquidity. It does not spend the new tokens. It creates them in your wallet and pays the chain a fee in BNB for the three transactions.

### The two pool addresses

You must also choose two addresses before deployment:

- `UNISWAP_V2_POOL_ADDRESS`
- `UNISWAP_V3_POOL_ADDRESS`

While a safety switch called transfer constraints is on, the token refuses every transfer to or from those two addresses. Ordinary wallet-to-wallet transfers still work. The switch starts on. The deployment command leaves it on.

This rulebook cannot change those two addresses after deployment. On a practice run, any two valid addresses are enough. On mainnet, use the two addresses you actually intend to block. If you do not have them yet, stop before the mainnet command. Guessing leaves the real pools unrestricted, or it blocks an address you later need.

The project does not check that the addresses are real exchange pools. An address with no contract on it yet is allowed. Transfers that touch it still fail while the switch is on.

Turning the switch off is a separate command, described at the end. Turning it off does not create a market. This rulebook cannot turn the switch back on.

## What you need

- A computer you control. The steps work on Windows, Mac, and Linux. The commands are the same.
- A new wallet used only for this deployment. MetaMask is the usual choice: <https://metamask.io>
- Paper and a pen for the secret recovery phrase.
- Node.js 22. The project accepts Node.js `22.21.1` or a later `22.x`, and it refuses Node.js 23 and newer. Check the version it prints, not the one the download button calls "latest."
- Git, so you can download the repository: <https://git-scm.com>
- For the practice network: nothing else. That run spends no BNB.
- For the BNB Smart Chain test network: test BNB from the official faucet. Test BNB has no money value.
- For BNB Smart Chain mainnet: a small amount of real BNB in the deployment wallet to pay the fee. The command prints the minimum it will accept and refuses to continue below that minimum. Keep a little more than the printed minimum, because the check is a safety floor for three transactions, not an exact bill.

Use a wallet that does not already hold savings. After a successful deployment, this wallet holds the whole supply, so treat it as the treasury from that moment on. Before that moment, fund it only with the BNB required for the fee.

## 1. Create the deployment wallet

1. Install MetaMask from <https://metamask.io>. Confirm the site name before you download.
2. Create a new wallet. Write the 12 or 24 words on paper, in order. Store the paper offline. MetaMask will ask you to confirm the words.
3. In that wallet, create a new account used only for this token. Give it a name you will recognize, such as `Token deployment`.
4. Copy the account address. It starts with `0x` and is 42 characters long. This is public. You will paste it into `.env` twice.
5. When you are ready to fill in `.env`, reveal the private key from that same account. In MetaMask the path is the account menu, then account details, then show private key. The wording can differ slightly by version. Enter the MetaMask password. Copy the key straight into `.env`. Close the reveal screen.
6. The private key is 64 hex characters, sometimes with `0x` in front. Either form is accepted. A key with spaces, a missing character, or a sentence around it is rejected with `PRIVATE_KEY must be a 32-byte hex string.`

Leave this wallet empty until a later step asks you to add test BNB or real BNB.

## 2. Add the BNB Smart Chain networks to the wallet

MetaMask needs the network details so you can see the fee balance and, later, the tokens. Look for "Add a custom network" or "Add network manually."

Test network, used first:

| Field | Value |
| --- | --- |
| Network name | BSC Testnet |
| RPC URL | `https://bsc-testnet-dataseed.bnbchain.org` |
| Chain ID | `97` |
| Currency symbol | `tBNB` |
| Block explorer | `https://testnet.bscscan.com` |

Mainnet, used only after the test network deployment looks right:

| Field | Value |
| --- | --- |
| Network name | BNB Smart Chain |
| RPC URL | `https://bsc-dataseed.bnbchain.org` |
| Chain ID | `56` |
| Currency symbol | `BNB` |
| Block explorer | `https://bscscan.com` |

Before you send real BNB, look at the chain id in MetaMask. `97` is the practice chain. `56` is real money.

## 3. Install Node.js and Git

Install Git from <https://git-scm.com/downloads>. Accept the default options.

Install Node.js 22 from <https://nodejs.org/en/download>. Choose the 22 line. If the front page offers a higher major version, open the other downloads and choose 22.

Open a terminal:

- Windows: press the Windows key, type `PowerShell`, and open Windows PowerShell.
- Mac: open Terminal from Applications, then Utilities.
- Linux: open Terminal.

Check the tools:

```bash
node -v
npm -v
git --version
```

`node -v` must print `v22.21.1` or another `v22` number at least that high, such as `v22.22.0`. If it prints `v20`, `v23`, `v24`, or anything that does not start with `v22`, stop and install Node.js 22 before continuing. The later commands are written for the version this repository pins.

`npm -v` comes with Node.js. `git --version` only needs to print a version.

## 4. Download the project

In the terminal, go to a folder you can find again, such as Documents:

```bash
cd Documents
git clone https://github.com/copy-ninja1/bsc-token.git
cd bsc-token
npm install
```

`npm install` can take several minutes. It is finished when the terminal shows a new line waiting for a command and no red error at the end.

Stay in this `bsc-token` folder for every later command. If you open a new terminal window, run `cd` back into it first.

## 5. Practice with no money and no wallet

This step uses a temporary chain inside the command. It ignores `.env` when you have not created that file yet. It spends nothing. When the command finishes, the practice token disappears. That is expected.

```bash
npm run compile
npm run test
npm run deploy:local
```

Wait for each one to finish before you start the next.

`npm run test` runs the project's checks. A passing run ends without a failing count. If tests fail, stop and send the last part of the output to the person helping you. Do not continue to a public network on a failing test run.

`npm run deploy:local` prints a configuration and ends with `Deployment checks passed.` It also prints a line that the practice chain discarded the token when the script exited. You should see:

- name `BTC Token` and symbol `BTC`, unless you already changed them
- decimals `18`
- supply `1000000000`
- transfer constraints enabled
- the proxy, implementation, and proxy admin addresses

You do not type `DEPLOY` for this local practice command.

Run it once. A second local run stops if `deployments/hardhat.json` already exists. That file is only a note about the practice run. Leave it. Do not set `ALLOW_REDEPLOY` to get past it.

## 6. Create the settings file

The settings live in a file named `.env` in the project folder. Git is set to ignore that file, so `git` will not upload it. The example file `.env.example` is safe to copy because its key line is empty.

The name starts with a dot, so Finder and some Windows folders hide it. The copy command still works.

Mac or Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` in a plain text editor. Notepad on Windows and TextEdit on Mac are fine. In TextEdit, switch to plain text before you save. Do not use Word, Google Docs, or Pages. Those editors change quotes and line breaks and will break the file.

Fill it in like this, using your own values. The comments explain each line. Lines starting with `#` are notes and are ignored.

```bash
# One line. The private key from the deployment account. 0x in front is fine.
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Practice chain first.
BSC_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org

# Leave this in place. The mainnet command will not run while the confirm flag below is false.
BSC_MAINNET_RPC_URL=https://bsc-dataseed.bnbchain.org

# Leave empty until you choose to publish the source on BscScan.
BSCSCAN_API_KEY=

TOKEN_NAME=BTC Token
TOKEN_SYMBOL=BTC
TOKEN_DECIMALS=18
TOKEN_INITIAL_SUPPLY=1000000000

# A public link you control, starting with https:// or ipfs://
TOKEN_METADATA_URI=https://example.com/your-token.json

# The same deployment address twice. This is the public address, not the key.
INITIAL_OWNER=0xYOUR_DEPLOYMENT_ADDRESS
INITIAL_SUPPLY_RECIPIENT=0xYOUR_DEPLOYMENT_ADDRESS

# Two different addresses you have chosen. Not your wallet. Not 0x000...000.
UNISWAP_V2_POOL_ADDRESS=0xYOUR_V2_POOL_ADDRESS
UNISWAP_V3_POOL_ADDRESS=0xYOUR_V3_POOL_ADDRESS

TOKEN_ADDRESS=
IMPLEMENTATION_ADDRESS=

# Turn the testnet flag on only when you are about to run the testnet command.
CONFIRM_TESTNET_DEPLOYMENT=false
CONFIRM_MAINNET_DEPLOYMENT=false
DEPLOY_CONFIRMATION=
CONFIRM_REMOVE_CONSTRAINTS=false
ALLOW_REDEPLOY=false
```

Rules the command enforces:

- `TOKEN_NAME` is 1 to 64 characters. `TOKEN_SYMBOL` is 1 to 32 characters.
- `TOKEN_DECIMALS` stays `18`.
- `TOKEN_INITIAL_SUPPLY` is a whole number of tokens, with no commas and no decimal point. `1000000000` means one billion tokens. The chain stores that as a much longer number with 18 extra zeros. You type the human number.
- `TOKEN_METADATA_URI` starts with `https://` or `ipfs://`, has no spaces, and is at most 512 characters. This rulebook stores that link once and has no button to change it. The page at the link can change later. The link stored in the contract cannot.
- `INITIAL_OWNER` and `INITIAL_SUPPLY_RECIPIENT` are both the deployment address, character for character. The command compares them with the address of `PRIVATE_KEY`.
- The two pool addresses are valid `0x` addresses, they are not the zero address, and neither one is your deployment wallet.
- `CONFIRM_MAINNET_DEPLOYMENT` stays `false` until the testnet token looks right and you have decided to spend real BNB.
- `ALLOW_REDEPLOY` stays `false`.
- `CONFIRM_REMOVE_CONSTRAINTS` stays `false`.

Save the file. Close the editor so you are not leaving the key on screen.

### A metadata link, if you do not have one yet

The contract stores a link. It does not upload a logo for you. If you already have a public `https://` or `ipfs://` address for a small JSON file, use that.

A simple file looks like this:

```json
{
  "name": "BTC Token",
  "symbol": "BTC",
  "decimals": 18,
  "description": "An independent token on BNB Smart Chain. It is not Bitcoin, it is not issued by Binance, and it is not backed by Bitcoin.",
  "image": "https://example.com/your-logo.png"
}
```

Host that file somewhere that stays online, then put the file's `https://` address in `TOKEN_METADATA_URI`. Match `name` and `symbol` to the values in `.env`. The image line is optional. Wallets may or may not display it. The contract only stores the link.

For the test network, a placeholder `https://` link is enough. For mainnet, use the permanent link you want stored, because this rulebook cannot replace it.

## 7. Get test BNB

Switch MetaMask to BSC Testnet, chain id `97`. Copy the deployment address.

Request test BNB only from the official BNB Chain faucet:

- <https://www.bnbchain.org/en/testnet-faucet>
- Explanation and other official request paths: <https://docs.bnbchain.org/bnb-smart-chain/developers/faucet/>

Paste the public address. A faucet that asks for your private key or your 12 words is not a faucet. Close it.

Read the page for the current limit. The official faucet page has required a small amount of real BNB on BNB Smart Chain mainnet at the same address before it sends test BNB, and it limits how often you can request. The official docs also describe requesting test BNB through the official BNB Chain Discord or the official Telegram bot. Test BNB cannot be sold for real money.

Wait until MetaMask, on the test network, shows a test BNB balance above zero.

## 8. Deploy on the test network

This spends test BNB only. It creates a practice token on chain id `97`. That token is public, and it has no money value. It is still a real deployment, so the addresses you get are the ones you will use to learn the result screen.

1. Open `.env`.
2. Set `CONFIRM_TESTNET_DEPLOYMENT=true`.
3. Leave `CONFIRM_MAINNET_DEPLOYMENT=false`.
4. Save.
5. In the project folder, run:

```bash
npm run deploy:testnet
```

The command talks to the test network, checks that the chain id is `97`, and prints the full configuration: name, symbol, supply, your address, the metadata link, and both pool addresses. It also prints your test BNB balance and a gas estimate. Read that block. If any line is wrong, press `Ctrl+C` or type anything other than `DEPLOY` when asked. Wrong text aborts the command and sends nothing.

When the printed block matches what you intend, type:

```text
DEPLOY
```

in capital letters, then press Enter.

The command then sends three transactions, waits for each receipt, and checks the token. Leave the window open until it finishes. A normal finish prints:

- `Deployment checks passed.`
- `Record: deployments/bscTestnet.json`
- three explorer links, for the proxy, the implementation, and the proxy admin
- three transaction ids

The proxy link is the token. Open it on `https://testnet.bscscan.com`.

### If the window cannot ask you to type

A normal PowerShell, Terminal, or Linux terminal will ask `Type DEPLOY to continue:`. Type it there.

If the command instead says to set `DEPLOY_CONFIRMATION=DEPLOY`, the window cannot accept typing. Put that line in `.env`, run the command again, and remove the line afterward so a later command does not treat the confirmation as already given.

### If it stops before `DEPLOY`

Common stops, and what they mean:

| Message | What to do |
| --- | --- |
| `PRIVATE_KEY must be a 32-byte hex string.` | The key is empty, has a space, or lost characters. Paste it again from MetaMask. Do not send the key with the error. |
| `INITIAL_OWNER must be the deployment wallet` | `INITIAL_OWNER` is not the address of that private key. Paste the deployment address again. |
| `INITIAL_SUPPLY_RECIPIENT must be the deployment wallet` | Same fix for the recipient line. |
| `BSC_TESTNET_RPC_URL is required` or `did not answer` | The test network URL is empty or unreachable. Use `https://bsc-testnet-dataseed.bnbchain.org`. |
| `Chain id mismatch` | The URL in `BSC_TESTNET_RPC_URL` is pointing at a different chain. Put the test network URL back. |
| `Deployer balance ... is below the safety minimum` | The wallet needs more test BNB. Request more from the faucet, wait until MetaMask shows it, and run the command again. |
| `Set CONFIRM_TESTNET_DEPLOYMENT=true` | That line in `.env` is still `false`. |
| `A deployment record already exists` | A previous run already wrote `deployments/bscTestnet.json`. Open that file and use the proxy address there. Do not set `ALLOW_REDEPLOY` unless you intentionally want a second, separate token. |

A failed run does not write the final record. Fix the line it names and run `npm run deploy:testnet` again.

## 9. Check the test token

In MetaMask, stay on BSC Testnet. Use "Import token" and paste the **proxy** address. Decimals are `18`. The symbol is the one you set. The balance should be the full supply, by default `1000000000`.

Importing the implementation address shows a balance of zero. That is the rulebook address, not the token. If the balance is zero, you imported the wrong one of the three addresses.

Back in the project folder:

```bash
npm run inspect:testnet
```

Read the printout. You want:

- the proxy address you just imported
- your deployment address as `Owner`
- the owner balance equal to the total supply
- `Transfer constraints enabled: true`
- the same two pool addresses you put in `.env`
- a line that transfers to or from those pools currently revert

On the testnet BscScan page for the proxy, the token name and the transaction list should match the record file `deployments/bscTestnet.json`. That file contains addresses and transaction ids. It does not contain your private key. Keep it. It is the note you compare against later.

Try a tiny transfer of the test token to a second address you own. That should succeed. A transfer to either pool address should fail. That failure is the safety switch working.

The test token is disposable. When you are satisfied that you understand the proxy address, the balance, and the switch, continue. You do not reuse the testnet proxy address on mainnet. Mainnet creates new addresses.

## 10. Deploy on mainnet

Do this only after the test network run succeeded and you have re-read the printed settings.

Mainnet uses real BNB. The transactions cannot be reversed. The name, symbol, supply, metadata link, and two pool addresses are stored by this rulebook with no edit button.

1. In MetaMask, switch to BNB Smart Chain, chain id `56`.
2. Send real BNB to the deployment address, enough to cover the fee plus a remainder. Start with a small amount you can afford to spend on fees. If the command says the balance is below its safety minimum, it has sent nothing yet, and you can add more BNB and run it again.
3. Open `.env` and confirm every token line is the mainnet choice, not a practice placeholder you meant to replace.
4. Set `CONFIRM_MAINNET_DEPLOYMENT=true`.
5. Leave `ALLOW_REDEPLOY=false` and `CONFIRM_REMOVE_CONSTRAINTS=false`.
6. Save.
7. Run:

```bash
npm run deploy:mainnet
```

The command checks that the chain id is `56`. If the URL is still the test network, it stops. Read the printed block the same way as on the test network. The block includes the supply, your address, the pool addresses, and a line that buying and selling through those pool addresses is not possible while the switch is on. The command will not turn the switch off.

Type `DEPLOY` only if every line is the token you want to exist. Any other text aborts the send.

On success the window prints `Deployment checks passed.`, writes `deployments/bsc.json`, and prints links on `https://bscscan.com`. Save the proxy address first. That is the token people must use.

Then:

```bash
npm run inspect:mainnet
```

Compare the printout with `deployments/bsc.json`. Import the proxy address in MetaMask on chain id `56`. The balance should be the full supply.

Write down, outside the chat window:

- proxy address
- implementation address
- proxy admin address
- the file `deployments/bsc.json`, stored with your own backups

Set `CONFIRM_MAINNET_DEPLOYMENT` back to `false` after the command succeeds, so a later accidental run has to be switched on again. Leave `ALLOW_REDEPLOY=false`. A second mainnet run with that flag turned on creates a second token. It does not edit the first one.

## 11. Show the source on BscScan

This step is optional. It publishes the source so visitors can read the same program the chain is running. It does not audit the token, it does not freeze the upgrade switch, and it does not turn off the pool switch.

1. Create a free account at <https://etherscan.io> and create an API key. BscScan uses that Etherscan key.
2. Put the key in `BSCSCAN_API_KEY` in `.env`.
3. Run the command that matches the deployment you are publishing:

```bash
npm run verify:testnet
```

```bash
npm run verify:mainnet
```

Wait until the command finishes without an error. If it exits with an error, the page is not verified yet. Run it again after you read the message, or leave the contracts unverified. Say they are verified only after the command succeeds.

On the proxy's BscScan page, check the linked logic contract against the implementation address in your record, and check the owner, the supply, and that constraints are still on.

More detail is in [VERIFICATION.md](VERIFICATION.md).

## 12. Later, if you decide the pools may receive the token

Skip this entire section until you mean to allow transfers to and from the two pool addresses. Deployment is already finished without it.

The owner wallet can turn the switch off once. This rulebook has no command to turn it back on. Turning it off does not add liquidity and does not list the token anywhere.

Test network:

```bash
CONFIRM_REMOVE_CONSTRAINTS=true npm run constraints:remove:testnet
```

Mainnet also requires `CONFIRM_MAINNET_DEPLOYMENT=true` in `.env`, then:

```bash
CONFIRM_REMOVE_CONSTRAINTS=true npm run constraints:remove:mainnet
```

The window asks you to type `REMOVE`. Any other text aborts it. After it succeeds, `npm run inspect:mainnet` prints `Transfer constraints enabled: false`.

There is no script in this project that gives the token to other people, that transfers the owner role, or that gives away the proxy admin. Those are separate decisions. This guide stops before them so they cannot run by accident.

## What to keep

- The paper copy of the secret recovery phrase, offline.
- The deployment wallet. Losing it means losing the tokens still in it and losing the upgrade switch.
- `deployments/bscTestnet.json` and `deployments/bsc.json` after each public deployment.
- The proxy address, written down as the token address.

## What stays on this computer

- `.env`
- the private key
- the recovery phrase

Before you zip the project folder to send to someone, delete `.env` or confirm the zip does not contain it. The other source files are already public on GitHub.

## A short picture of a correct run

1. You created a new wallet and wrote the words on paper.
2. You installed Node.js 22 and Git, cloned the repository, and `npm install` finished.
3. `npm run test` and `npm run deploy:local` finished, and the local token was only a practice run.
4. `.env` is on your computer, with your key, your address twice, your metadata link, and your two pool addresses.
5. Testnet deployment printed `Deployment checks passed.` You imported the proxy and saw the full supply.
6. Mainnet deployment did the same on chain id `56`, and you saved the proxy address from `deployments/bsc.json`.
7. Nobody else has seen the private key or the recovery phrase.
