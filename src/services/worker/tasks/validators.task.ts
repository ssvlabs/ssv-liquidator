import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { QueuesEnum, TasksQueuesEnum } from '../../../queues/enums/tasks.enum';
import { SystemService, SystemType } from '../../../modules/system/system.service';
import { AddressService } from '../../../modules/addresses/address.service';
import { ConfService } from '../../../shared/services/conf.service';
import UtilsService from '../../../providers/utils.service';
const Web3 = require('web3');

const CONTRACT_ABI = require('../../../shared/abi-ssv-registry.json');
@Processor(QueuesEnum.VALIDATORS)
export class ValidatorsTask {
  constructor(
    private _config: ConfService,
    private _addressService: AddressService,
    private _systemService: SystemService
  ) {}

  @Process(TasksQueuesEnum.FETCH_VALIDATORS.name)
  async fetch(job: Job): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching register validator events...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_REGISTRY_ADDRESS'));
    const latestBlock = await web3.eth.getBlockNumber();
    const fromBlock = await this._systemService.get(SystemType.VALIDATORS_LAST_BLOCK_NUMBER);
    const filters = {
      fromBlock: fromBlock ? fromBlock + 1 : 0,
      toBlock: latestBlock
    };
    console.log(`fetching new validators...`, filters);
    try {
      const events = await contract.getPastEvents('ValidatorAdded', filters);
      const result = events
        .map(row => Object.keys(row.returnValues).reduce((aggr, key) => {
          if (key === 'oessList') {
            aggr['operatorPublicKeys'] = row.returnValues[key].reduce((res, value) => {
              res.push(UtilsService.convertPublickey(value.operatorPublicKey));
              return res;
            }, []);
          } else if (isNaN(key as any)) {
            aggr[key] = row.returnValues[key];
          }
          return aggr;
        }, {}));
  
      await Promise.all(UtilsService.toChunks(result, 900).map(chunk => this._addressService.create(chunk)));
      await Promise.all(UtilsService.toChunks(result, 100).map(chunk => this._addressService.saveUsedOperators(chunk)));
  
      await this._systemService.save(SystemType.VALIDATORS_LAST_BLOCK_NUMBER, latestBlock);
      console.log(`got ${events.length} events of registered validators...`)
    } catch (e) {
      console.log(e);
    }
  }
}
