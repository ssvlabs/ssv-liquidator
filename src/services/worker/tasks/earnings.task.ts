import InputDataDecoder from 'ethereum-input-data-decoder';
import Web3Provider from '@cli/providers/web3.provider';

import { HttpService, Injectable } from '@nestjs/common';

import { ConfService } from '@cli/shared/services/conf.service';
import { EarningService } from '@cli/modules/earnings/earning.service';
import { SystemService, SystemType } from '@cli/modules/system/system.service';

@Injectable()
export class EarningsTask {
  constructor(
    private _config: ConfService,
    private _httpService: HttpService,
    private _earningService: EarningService,
    private _systemService: SystemService,
  ) {}

  async getEarnings(): Promise<void> {
    const decoder = new InputDataDecoder(Web3Provider.abi);
    const apiUri = 'https://api-goerli.etherscan.io/api';
    const latestBlock = await Web3Provider.web3.eth.getBlockNumber();
    const fromBlock =
      (await this._systemService.get(SystemType.EARNINGS_LAST_BLOCK_NUMBER)) ||
      0;

    const liquidatorAddress =
      Web3Provider.web3.eth.accounts.privateKeyToAccount(
        this._config.get('ACCOUNT_PRIVATE_KEY'),
      ).address;

    const txsList = await this._httpService
      .get(
        `${apiUri}?module=account&action=txlist&address=${liquidatorAddress}&startblock=${fromBlock}&endblock=${latestBlock}&endblock=0&page=1&offset=10000&sort=asc&apikey=${this._config.get(
          'ETHERSCAN_KEY',
        )}`,
      )
      .toPromise();

    const filteredTxs = txsList.data.result.filter(
      item =>
        item.to.toLowerCase() ===
          this._config.get('SSV_NETWORK_ADDRESS').toLowerCase() &&
        item.isError === '0',
    );

    for (const tx of filteredTxs) {
      const { method } = decoder.decodeData(tx.input);
      if (method === 'liquidate') {
        const txReceipt: any = await this._httpService
          .get(
            `${apiUri}?module=proxy&action=eth_getTransactionReceipt&txhash=${
              tx.hash
            }&apikey=${this._config.get('ETHERSCAN_KEY')}`,
          )
          .toPromise();

        const earnedData = {
          hash: tx.hash,
          liquidatorAddress,
          gasPrice: +tx.gasPrice / 1e18,
          gasUsed: tx.gasUsed,
          earned: null,
          earnedAtBlock: tx.blockNumber,
        };

        if (txReceipt.data) {
          const { logs } = txReceipt.data.result;
          const transferData = logs.find(
            log =>
              log.address ===
              this._config.get('SSV_TOKEN_ADDRESS').toLowerCase(),
          );
          earnedData.earned =
            transferData &&
            +Web3Provider.web3.utils.hexToNumberString(transferData.data) /
              1e18;
        }
        await this._earningService.update(earnedData);
      }
    }

    await this._systemService.save(
      SystemType.EARNINGS_LAST_BLOCK_NUMBER,
      latestBlock,
    );
  }
}
