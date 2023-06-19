import { ArgumentParser } from 'argparse';
import { ConfigService } from '@nestjs/config';

export class ConfService extends ConfigService {
  private GAS_PRICE = 'low';
  private NODE_URL = 'eth.infra.com';
  private MAX_VISIBLE_BLOCKS = 50000;
  private SSV_SYNC_ENV = 'prod';

  public init() {
    const parser = new ArgumentParser();

    parser.add_argument('-sse', '--ssv-sync-env', {
      help: `The SSV sync environment (prod or stage). Default: ${this.SSV_SYNC_ENV}`,
      required: false,
    });
    parser.add_argument('-ss', '--ssv-sync', {
      help: `The SSV contract name (format: version.network), for example: v4.prater`,
      required: false,
    });
    parser.add_argument('-ht', '--hide-table', {
      type: 'int',
      help: `Hide the summary table. Default is 0 (show)`,
      required: false,
    });
    parser.add_argument('-n', '--node-url', {
      help: `The liquidator's execution layer node URL used for syncing contract events. Default: ${this.NODE_URL}`,
      required: false,
    });
    parser.add_argument('-pk', '--private-key', {
      help: "The liquidator's recipient address private key, used for creating a liquidation transaction",
      required: false,
    });
    parser.add_argument('-na', '--ssv-network-address', {
      help:
        'The SSV Contract Network address, used to listen to balance change events and to create a liquidation transaction. ' +
        'Refer to https://docs.ssv.network/developers/smart-contracts',
      required: false,
    });
    parser.add_argument('-nva', '--ssv-network-views-address', {
      help:
        'The SSV Contract Network Views address, used to listen to balance change events and to create a liquidation transaction. ' +
        'Refer to https://docs.ssv.network/developers/smart-contracts',
      required: false,
    });
    parser.add_argument('-g', '--gas-price', {
      help: `Preferred gas price for the liquidate transaction (low , medium, high). Default: ${this.GAS_PRICE}`,
      required: false,
    });
    parser.add_argument('-t', '--ssv-token-address', {
      help:
        'SSV Token address. ' +
        'Refer to https://docs.ssv.network/developers/smart-contracts',
      required: false,
    });
    parser.add_argument('-nrl', '--node-rate-limit', {
      help: 'Node Rate Limit. Default value: 10',
      required: false,
    });
    parser.add_argument('-mvb', '--max-visible-blocks', {
      help: `Max block range to display active clusters. Default: ${this.MAX_VISIBLE_BLOCKS}`,
      required: false,
    });

    const args = parser.parse_args();
    Object.keys(args).forEach(key => {
      if (args[key] === undefined) args[key] = '';
    });

    const envVars = {
      // ENV name -> argparse name
      SSV_SYNC_ENV: 'ssv_sync_env',
      SSV_SYNC: 'ssv_sync',
      GAS_PRICE: 'gas_price',
      ACCOUNT_PRIVATE_KEY: 'private_key',
      NODE_URL: 'node_url',
      HIDE_TABLE: 'hide_table',
      NODE_RATE_LIMIT: 'node_rate_limit',
      MAX_VISIBLE_BLOCKS: 'max_visible_blocks',
    };
    for (const envVarName of Object.keys(envVars)) {
      process.env[envVarName] =
        // First check if it exists in cli param
        args[envVars[envVarName]] ||
        // Then check if there is env variable
        process.env[envVarName] ||
        // Then check if there is default value
        this[envVarName];

      if (!process.env[envVarName]) {
        console.error(
          '\x1b[31m%s\x1b[0m',
          `Error: ${envVarName} is not found.`,
        );
        console.error('Run cmd: "yarn cli --help" for more details');
        process.exit(1);
      }
    }
  }

  public rateLimit(): number {
    return this.getNumber('NODE_RATE_LIMIT') || 10;
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }
}
