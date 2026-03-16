import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CustomLogger } from '@cli/shared/services/logger.service';
import { VerifyThresholdTask } from '@cli/services/worker/tasks/verify-threshold.task';

@Injectable()
export class VerifyThresholdCron {
  private readonly _logger = new CustomLogger(VerifyThresholdCron.name);

  constructor(private _task: VerifyThresholdTask) {}

  @Cron('*/15 * * * *')
  async verify(): Promise<void> {
    try {
      await this._task.verify();
    } catch (e) {
      this._logger.error(e);
    }
  }
}
