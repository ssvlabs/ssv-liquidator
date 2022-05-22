# SSV Network Liquidator

CLI to work with SSV Network liquidation flow, liquidate and earn SSV tokens.
Use a private key to proceed account liquidation process.


## Installation

```sh
git clone git@github.com:bloxapp/ssv-liquidator.git
cd ssv-liquidator
yarn
```

## Configuration

After installation add configuration settings into `.env` file, such as:

```sh
NODE_URL= # ETH node url
SSV_NETWORK_ADDRESS= # ssv network contract address
ACCOUNT_PRIVATE_KEY= # private key of your wallet
GAS_PRICE=normal # slow/normal/high
```

## Running CLI

Executable command:
`yarn cli ...` or `yarn dev:cli ...`

## Development

### Run CLI as TypeScript executable

```bash
yarn dev:cli ...
```

### Run CLI as JavaScript compiled executable

```bash
yarn cli ...
```

### Lint

```bash
yarn lint
```

### Testing

* TODO

### Building

Build TypeScript into JavaScript

```bash
yarn build
```

Build for NodeJs using `esbuild`

```bash
yarn esbuild
```

Build everything

```bash
yarn build-all
```

## TODO

* 

## Authors

* [Wadym Chumak](https://github.com/vadiminc)

## License

MIT License