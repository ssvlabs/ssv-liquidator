import { Injectable } from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';

import { BurnRatesTask } from '../tasks/burn-rates.task';

@Injectable()
export class BurnRateCron {
  constructor(private _burnRatesTask: BurnRatesTask) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncBurnRates(): Promise<void> {
    try {
      await this._burnRatesTask.syncBurnRates();
    } catch (e) {
      console.log('syncBurnRates', e);
    }
  }
}
