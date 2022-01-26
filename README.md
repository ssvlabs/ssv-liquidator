# SSV Network Liquidator
This repository contains a CLI tool for SSV Network liquidators..

## Features

```
- fetch validator addresses
- monitor burn rate and liquidation status
- liquidate validator addresses
- monitor all own earnings with gas spent
```

## Quick start

The first things you need to do are cloning this repository and installing its
dependencies:

```sh
git clone git@github.com:bloxapp/ssv-liquidator.git
cd ssv-liquidator
yarn
```

And add configuration settings into `.env` file, such as:

```sh
WORKER_PORT=3030
NODE_URL= # ETH node url
SSV_NETWORK_ADDRESS= # ssv network contract address
ACCOUNT_PRIVATE_KEY= # private key of your wallet
LIQUIDATE_BATCH_SIZE=2
GAS_PRICE=normal # slow/normal/high
```

### Run cli tool
Once installed, to run cli:

```sh
yarn start
```