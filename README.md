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
CLI to run a liquidator and earn SSV tokens.

## Installation
This installation requires NodeJS on your machine.
You can download it [here](https://nodejs.org/en/download/).


```sh
git clone https://github.com/bloxapp/ssv-liquidator.git
cd ssv-liquidator
npm install -g yarn
yarn install
yarn cli --help
```

## Running CLI

### Option 1: Running with CLI arguments
Input parameters:  
node-url (n) = ETH1 node url  
private-key (pk) = Account private key  
contract-address (c) = Contract Address  
gas-price (g) = Gas price, default: slow  

```sh
yarn cli --node-url=eth.infra.com --private-key=a70478942bf --contract-address=0x425890f2a5g --gas-price=slow
```

##### Help on available CLI actions:  

```sh
yarn cli --help
```

### Option 2: Using an env file
Update the .env.example file with your parameters and rename the file to .env
Example content below:
```sh
NODE_URL=eth.infra.com
SSV_NETWORK_ADDRESS=0x425890f2a5g
SSV_TOKEN_ADDRESS=0x425890f2a5g84hw94
ACCOUNT_PRIVATE_KEY=a70478942bf
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
