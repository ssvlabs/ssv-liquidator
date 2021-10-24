import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';

import { QueuesEnum, TasksQueuesEnum } from './enums/tasks.enum';

@Injectable()
export class QueueService {
  private _queues: { [name: string]: Queue } = {};

  constructor(
    @InjectQueue(QueuesEnum.VALIDATORS) private _validatorsQueue: Queue,
    @InjectQueue(QueuesEnum.BURN_RATES) private _burnRatesQueue: Queue,
  ) {
    this._queues[QueuesEnum.VALIDATORS] = this._validatorsQueue;
    this._queues[QueuesEnum.BURN_RATES] = this._burnRatesQueue;
  }

  async fetchValidatorsJob(): Promise<void> {
    console.log('fetchValidators');
    const { queue, name } = TasksQueuesEnum.FETCH_VALIDATORS;
    await this._queues[queue].add(name, {});
  }

  async syncBurnRatesJob(): Promise<void> {
    console.log('syncBurnRates');
    const { queue, name } = TasksQueuesEnum.SYNC_BURN_RATES;
    await this._queues[queue].add(name, {});
  }
}
