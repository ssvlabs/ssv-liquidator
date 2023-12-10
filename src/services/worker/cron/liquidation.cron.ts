import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { LiquidationTask } from '../tasks/liquidation.task';
import { CustomLogger } from '@cli/shared/services/logger.service';

@Injectable()
export class LiquidationCron {
  private readonly _logger = new CustomLogger(LiquidationCron.name);
  constructor(private _liquidationTask: LiquidationTask) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async liquidate(): Promise<void> {
    try {
      await this._liquidationTask.liquidate();
    } catch (e) {
      this._logger.error(e);
    }
  }
}
