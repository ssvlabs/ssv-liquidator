import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { BurnRatesTask } from '../tasks/burn-rates.task';

@Injectable()
export class BurnRateCron {
  constructor(private _burnRatesTask: BurnRatesTask) {}

  @Cron('*/10 * * * * *')
  async syncBurnRates(): Promise<void> {
    try {
      await this._burnRatesTask.syncBurnRates();
    } catch (e) {
      console.log('syncBurnRates', e);
    }
  }
}
