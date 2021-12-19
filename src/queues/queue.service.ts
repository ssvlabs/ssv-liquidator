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
    @InjectQueue(QueuesEnum.LIQUIDATION) private _liquidationQueue: Queue,
  ) {
    this._queues[QueuesEnum.VALIDATORS] = this._validatorsQueue;
    this._queues[QueuesEnum.BURN_RATES] = this._burnRatesQueue;
    this._queues[QueuesEnum.LIQUIDATION] = this._liquidationQueue;
  }

  async fetchNewValidatorsJob(): Promise<void> {
    console.log('fetchNewValidators');
    const { queue, name } = TasksQueuesEnum.FETCH_NEW_VALIDATORS;
    await this._queues[queue].add(name, {});
  }

  async fetchUpdatedValidatorsJob(): Promise<void> {
    console.log('fetchUpdatedValidators');
    const { queue, name } = TasksQueuesEnum.FETCH_UPDATED_VALIDATORS;
    await this._queues[queue].add(name, {});
  }

  async syncBurnRatesJob(): Promise<void> {
    console.log('syncBurnRates');
    const { queue, name } = TasksQueuesEnum.SYNC_BURN_RATES;
    await this._queues[queue].add(name, {});
  }

  async syncLiquidatedAddressesJob(): Promise<void> {
    console.log('syncLiquidatedAddresses');
    const { queue, name } = TasksQueuesEnum.SYNC_LIQUIDATED_ADDRESSES;
    await this._queues[queue].add(name, {});
  }

  async syncDepositsJob(): Promise<void> {
    console.log('syncDeposits');
    const { queue, name } = TasksQueuesEnum.SYNC_DEPOSITS;
    await this._queues[queue].add(name, {});
  }

  async syncWithdrawsJob(): Promise<void> {
    console.log('syncWithdraws');
    const { queue, name } = TasksQueuesEnum.SYNC_WITHDRAWS;
    await this._queues[queue].add(name, {});
  }

  async liquidateJob(): Promise<void> {
    console.log('liquidate');
    const { queue, name } = TasksQueuesEnum.LIQUIDATE;
    await this._queues[queue].add(name, {});
  }
}
