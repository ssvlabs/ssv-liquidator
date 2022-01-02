import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { BurnRatesTask } from '../tasks/burn-rates.task';

@Injectable()
export class BurnRateCron {
  constructor(
    private _burnRatesTask: BurnRatesTask,
  ) {}

  @Cron('0 * * * * *')
  async syncBurnRates(): Promise<void> {
    try {
      await this._burnRatesTask.syncBurnRates();
    } catch (e) {
      console.log(e);
    }
  }

  @Cron('0 * * * * *')
  async syncLiquidatedAddresses(): Promise<void> {
    try {
      await this._burnRatesTask.syncLiquidatedAddresses();
    } catch (e) {
      console.log(e);
    }
  }

  @Cron('0 * * * * *')
  async syncDeposits(): Promise<void> {
    try {
      await this._burnRatesTask.syncFundsDeposited();
    } catch (e) {
      console.log(e);
    }
  }

  @Cron('0 * * * * *')
  async syncWithdraws(): Promise<void> {
    try {
      await this._burnRatesTask.syncFundsWithdrawn();
    } catch (e) {
      console.log(e);
    }
  }
}
