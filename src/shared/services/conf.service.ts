import { ArgumentParser } from 'argparse';
import { ConfigService } from '@nestjs/config';

export class ConfService extends ConfigService {
  private SSV_NETWORK_ADDRESS = '0x87F7efc8C4c86cf30983f0793860B18A1fa8F127';
  private SSV_TOKEN_ADDRESS = '0x3651c03a8546da82affaef8c644d4e3efdd37718';
  private GAS_PRICE = 'slow';

  public init() {
    const parser = new ArgumentParser();

    parser.add_argument('-n', '--node-url', { help: 'ETH1 node url' });
    parser.add_argument('-pk', '--private-key', {
      help: 'Account private key',
    });
    parser.add_argument('-c', '--contract-address', {
      help: `Contract Address, default: ${this.SSV_NETWORK_ADDRESS}`,
    });
    parser.add_argument('-g', '--gas-price', {
      help: `Gas price, default: ${this.GAS_PRICE}`,
    });

    const args = parser.parse_args();
    Object.keys(args).forEach(key => {
      if (args[key] === undefined) args[key] = '';
    });

    process.env.SSV_TOKEN_ADDRESS = this.SSV_TOKEN_ADDRESS;
    process.env.SSV_NETWORK_ADDRESS =
      args['contract_address'] || this.SSV_NETWORK_ADDRESS;
    process.env.GAS_PRICE = args['gas_price'] || this.GAS_PRICE;
    process.env.ACCOUNT_PRIVATE_KEY =
      args['private_key'] || process.env.ACCOUNT_PRIVATE_KEY;
    process.env.NODE_URL = args['node_url'] || process.env.NODE_URL;

    let notFoundParam = null;
    if (!process.env.NODE_URL) {
      notFoundParam = 'NODE_URL';
    } else if (!process.env.ACCOUNT_PRIVATE_KEY) {
      notFoundParam = 'ACCOUNT_PRIVATE_KEY';
    } else if (!process.env.SSV_TOKEN_ADDRESS) {
      notFoundParam = 'SSV_TOKEN_ADDRESS';
    }

    if (notFoundParam) {
      console.log('\x1b[31m%s\x1b[0m', `Error: ${notFoundParam} is not found.`);
      console.log('Run cmd: "yarn cli --help" for more details');
      process.exit(1);
    }
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }
}
