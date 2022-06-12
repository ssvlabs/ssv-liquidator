import { ArgumentParser } from 'argparse';
import { ConfigService } from '@nestjs/config';

export class ConfService extends ConfigService {
  private SSV_NETWORK_ADDRESS = '0x87F7efc8C4c86cf30983f0793860B18A1fa8F127';
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

    process.env.SSV_NETWORK_ADDRESS =
      args['contract_address'] || this.SSV_NETWORK_ADDRESS;
    process.env.GAS_PRICE = args['gas_price'] || this.GAS_PRICE;
    process.env.ACCOUNT_PRIVATE_KEY = args['private_key'];
    process.env.NODE_URL = args['node_url'];
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }
}
