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
CLI to work with SSV Network liquidation flow, liquidate and earn SSV tokens.
Use a private key to proceed account liquidation process.


## Installation

```sh
git clone https://github.com/bloxapp/ssv-liquidator.git
cd ssv-liquidator
#install yarn
npm install -g yarn
yarn install
yarn cli --help
```

## Configuration

After installation add configuration settings into `.env` file, such as:

```sh
NODE_URL= # ETH node url
SSV_NETWORK_ADDRESS= # ssv network contract address
ACCOUNT_PRIVATE_KEY= # private key of your wallet
GAS_PRICE=normal # slow/normal/high/highest
```

## Running CLI

Executable command:
`yarn cli`

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

## TODO

* 

## Authors

* [Wadym Chumak](https://github.com/vadiminc)

## License

MIT License
