import moment from 'moment';

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { QueuesEnum, TasksQueuesEnum } from '../../../queues/enums/tasks.enum';

import { SystemService, SystemType } from '../../../modules/system/system.service';
import { AddressService } from '../../../modules/addresses/address.service';
import { ConfService } from '../../../shared/services/conf.service';

const Web3 = require('web3');

const CONTRACT_ABI = require('../../../shared/abi.json');
@Processor(QueuesEnum.BURN_RATES)
export class BurnRatesTask {
  constructor(
    private _config: ConfService,
    private _addressService: AddressService,
    private _systemService: SystemService
  ) {}

  @Process(TasksQueuesEnum.SYNC_BURN_RATES.name)
  async sync(job: Job): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`syncing burn rate updates events...`);
    try {
      const web3 = new Web3(this._config.get('NODE_URL'));
      const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('CONTRACT_ADDRESS'));
      const missedRecords = await this._addressService.findBy({ where: { burnRate: null }, take: 100 });
      const burnRates = await Promise.all(missedRecords.map(({ ownerAddress }) => contract.methods.burnRate(ownerAddress).call()));
      const balances = await Promise.all(missedRecords.map(({ ownerAddress }) => contract.methods.totalBalanceOf(ownerAddress).call()));
      console.log("burnRates", burnRates);
      console.log("balances", balances);
      missedRecords.forEach((record, index) => {
        if (+burnRates[index] > 0) {
          record.burnRate = +burnRates[index];
          const daysToLiquidate = +(+balances[index] / +burnRates[index]).toFixed(0);
          record.liquidateAt = moment().add(daysToLiquidate, 'days').toDate();  
        }
      });
      await Promise.all(missedRecords.map(record => this._addressService.update(record)));
    } catch(e) {
      console.log(e);
    }
  }
}
