import { Injectable } from '@nestjs/common';
import { SystemService, SystemType } from '../../../modules/system/system.service';
import { AddressService } from '../../../modules/addresses/address.service';
import { ConfService } from '../../../shared/services/conf.service';
import UtilsService from '../../../providers/utils.service';
const Web3 = require('web3');

const CONTRACT_ABI = require('../../../shared/abi-ssv-network.json');
@Injectable()
export class ValidatorsTask {
  constructor(
    private _config: ConfService,
    private _addressService: AddressService,
    private _systemService: SystemService
  ) {}

  async fetchNewValidators(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching register validator events...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
    const latestBlock = await web3.eth.getBlockNumber();
    const fromBlock = await this._systemService.get(SystemType.NEW_VALIDATORS_LAST_BLOCK_NUMBER);
    const filters = {
      fromBlock: fromBlock ? fromBlock + 1 : 0,
      toBlock: latestBlock
    };
    console.log(`fetching new validators...`, filters);
    const events = await contract.getPastEvents('ValidatorAdded', filters);
    const result = events
      .map(row => Object.keys(row.returnValues).reduce((aggr, key) => {
        if (isNaN(key as any)) {
          aggr[key] = row.returnValues[key];
        }
        return aggr;
      }, {}));
    await Promise.all(UtilsService.toChunks(result, 900).map(chunk => this._addressService.create(chunk)));

    await this._systemService.save(SystemType.NEW_VALIDATORS_LAST_BLOCK_NUMBER, latestBlock);
    console.log(`got ${events.length} events of registered validators...`);
  }

  async fetchUpdatedValidators(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching updated validator events...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
    const latestBlock = await web3.eth.getBlockNumber();
    const fromBlock = await this._systemService.get(SystemType.UPDATED_VALIDATORS_LAST_BLOCK_NUMBER);
    const filters = {
      fromBlock: fromBlock ? fromBlock + 1 : 0,
      toBlock: latestBlock
    };
    console.log(`fetching updated validators...`, filters);
    const events = await contract.getPastEvents('ValidatorUpdated', filters);
    const result = events
      .map(row => Object.keys(row.returnValues).reduce((aggr, key) => {
        if (isNaN(key as any)) {
          aggr[key] = row.returnValues[key];
        }
        return aggr;
      }, {}));
    await Promise.all(UtilsService.toChunks(result, 900).map(chunk => this._addressService.update({ ownerAddress: chunk.ownerAddress, burnRate: null })));

    await this._systemService.save(SystemType.UPDATED_VALIDATORS_LAST_BLOCK_NUMBER, latestBlock);
    console.log(`got ${events.length} events of updated validators...`);
  }
}
