import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { BurnRatesTask } from '../tasks/burn-rates.task';
import { CustomLogger } from '@cli/shared/services/logger.service';

@Injectable()
export class BurnRateCron {
  private readonly _logger = new CustomLogger(BurnRatesTask.name);
  constructor(private _burnRatesTask: BurnRatesTask) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncBurnRates(): Promise<void> {
    try {
      await this._burnRatesTask.syncBurnRates();
    } catch (e) {
      this._logger.error(e);
    }
  }
}
