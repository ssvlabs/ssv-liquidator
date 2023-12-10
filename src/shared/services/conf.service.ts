import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { ArgumentParser } from 'argparse';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfService extends ConfigService {
  private GAS_PRICE = 'low';
  private NODE_URL = 'eth.infra.com';
  private MAX_VISIBLE_BLOCKS = 50000;
  private SSV_SYNC_ENV = 'prod';
  private SSV_SYNC = 'v4.prater';

  constructor() {
    super();
    const parser = new ArgumentParser();

    parser.add_argument('-sse', '--ssv-sync-env', {
      help: `The SSV sync environment (prod or stage). Default: ${this.SSV_SYNC_ENV}`,
      required: false,
    });
    parser.add_argument('-ss', '--ssv-sync', {
      help: `The SSV contract name (format: version.network). Default: ${this.SSV_SYNC}`,
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
    parser.add_argument('-g', '--gas-price', {
      help: `Preferred gas price for the liquidate transaction (low , medium, high). Default: ${this.GAS_PRICE}`,
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
      MAX_VISIBLE_BLOCKS: 'max_visible_blocks',
    };

    for (const envVarName of Object.keys(envVars)) {
      const found =
        args[envVars[envVarName]] ||
        // Then check if there is env variable
        process.env[envVarName] ||
        // Then check if there is default value
        this[envVarName];
      if (found) {
        process.env[envVarName] = found;
      }
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

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }

  gasUsage(): number {
    return 300000; // tmp solution
    // const gasGroups = {
    //   '4': 132700,
    //   '7': 173600,
    //   '10': 215300,
    //   '13': 257200,
    // };
    // return gasGroups[`${operatorsCount}`];
  }
}
