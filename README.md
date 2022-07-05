# SSV Network Liquidator
![GitHub](https://img.shields.io/github/license/bloxapp/ssv-liquidator)
![GitHub package.json version](https://img.shields.io/github/package-json/v/bloxapp/ssv-liquidator)

![GitHub commit activity](https://img.shields.io/github/commit-activity/y/bloxapp/ssv-liquidator)
![GitHub contributors](https://img.shields.io/github/contributors/bloxapp/ssv-liquidator)
![GitHub last commit](https://img.shields.io/github/last-commit/bloxapp/ssv-liquidator)

![GitHub package.json dynamic](https://img.shields.io/github/package-json/keywords/bloxapp/ssv-liquidator)
![GitHub package.json dynamic](https://img.shields.io/github/package-json/author/bloxapp/ssv-liquidator)

![Discord](https://img.shields.io/discord/723834989506068561?style=for-the-badge&label=Ask%20for%20support&logo=discord&logoColor=white)

---
The SSV Liquidator node executes liquidations on accounts that do not hold enough balance to pay for their operational fees

##### The liquidator node performs 2 main processes:

- Syncing network contract data Every minute the liquidator node pulls recent balance-determining events for the SSV networks contract and maps all of the network's accounts on the node level to calculate the potential block for liquidation for each account in the network
- Liquidating accounts Once the potential liquidation block is reached the liquidator node will call the liquidate() function in the network contract, if the node was the first to successfully pass the transaction the account will be liquidated and its SSV collateral will be sent to the wallet address which performed the liquidation

## Requirements 

### ETH1 Node and other parameters

In order to be able to fetch all the operators and their status from the contract and react on different events
you need to specify an ETH1 Node URI. If you want to work with a production environment then you must specify `eth.infra.com` as the `--node-url` parameter for the CLI. As alternative you can set it up in `.env` file as the `NODE_URL`. Examples below for both scenarios.

If you want to play with the testnet you can register in `alchemyapi.io`.  Once registered the URL will look like: 
`https://eth-goerli.alchemyapi.io/v2/<your-token-here>`

Review `yarn cli --help` output and `.env.example` file for all of the parameters required for liquidator to work.


### Node JS

This installation requires NodeJS on your machine.
You can download it [here](https://nodejs.org/en/download/).

## Installation

```sh
git clone https://github.com/bloxapp/ssv-liquidator.git
cd ssv-liquidator
yarn install
```

## Running the CLI

### Option 1: Running with CLI arguments
##### Help on available CLI actions:  

```sh
yarn cli --help
```

Input parameters:  
node-url (n) = ETH1 node url  
private-key (pk) = Account private key  
contract-address (c) = Contract Address  
gas-price (g) = Gas price, default: slow  
ssv-token-address (t) = The contract address for the SSV token  

```sh
yarn cli --node-url=eth.infra.com --private-key=a70478942bf... --contract-address=0x425890f2a5g... --gas-price=slow --ssv-token-address=0x425890f2a5g84hw94...
```

Example of minimal configuration to run CLI:

```sh
yarn cli --private-key=a70478942bf...
```

If you saved all the parameters in `.env` file you can just run:

```shell
yarn cli
```

### Option 2: Using an env file

Copy the `.env.example` file to `.env` and update `.env` with your parameters.

Example content below:

```sh
NODE_URL=eth.infra.com  
SSV_NETWORK_ADDRESS=0x425890f2a5g...  
SSV_TOKEN_ADDRESS=0x425890f2a5g84hw94...  
ACCOUNT_PRIVATE_KEY=a70478942bf...  
GAS_PRICE=slow  
```

## Development

### Run CLI as TypeScript executable

```bash
yarn cli
```

### Lint

```bash
yarn lint
```

### Testing

* TODO

## Authors

* [Wadym Chumak](https://github.com/vadiminc)

## License

MIT License
