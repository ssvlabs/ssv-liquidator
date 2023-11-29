import { Injectable } from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';

import { LiquidationTask } from '../tasks/liquidation.task';

@Injectable()
export class LiquidationCron {
  constructor(private _liquidationTask: LiquidationTask) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async liquidate(): Promise<void> {
    try {
      await this._liquidationTask.liquidate();
    } catch (e) {
      console.log(e);
    }
  }
}
