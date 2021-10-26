import crypto from 'crypto';

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { QueuesEnum, TasksQueuesEnum } from '../../../queues/enums/tasks.enum';
import { QueueService } from '../../../queues/queue.service';
import { SystemService, SystemType } from '../../../modules/system/system.service';
import { ConfService } from '../../../shared/services/conf.service';

const Web3 = require('web3');

const CONTRACT_ABI = require('../../../shared/abi.json');

function convertPublickey(rawValue) {
  const decoded = (new Web3()).eth.abi.decodeParameter('string', rawValue.replace('0x', ''));
  return crypto.createHash('sha256').update(decoded).digest('hex');
}

@Processor(QueuesEnum.VALIDATORS)
export class ValidatorsTask {
  constructor(private _config: ConfService) {}

  @Process(TasksQueuesEnum.FETCH_VALIDATORS.name)
  async fetch(job: Job): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching register validator events...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('CONTRACT_ADDRESS'));
    const latestBlock = await web3.eth.getBlockNumber();
    const filters = {
      fromBlock: 0, // fromBlock ? fromBlock + 1 : 0,
      toBlock: latestBlock
    };
    console.log(`fetching ValidatorAdded...`, filters);
    const events = await contract.getPastEvents('ValidatorAdded', filters);
    console.log(`got ${events.length} events of ValidatorAdded...`);
  }
}
