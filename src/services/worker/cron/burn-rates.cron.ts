import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ValidatorService } from '../../../modules/validators/validator.service';
import { QueueService } from '../../../queues/queue.service';

@Injectable()
export class BurnRateCron {
  constructor(
    private _validatorService: ValidatorService,
    private _queuesService: QueueService,
  ) {}

  @Cron('0 * * * * *')
  async update(): Promise<void> {
    await this._queuesService.syncBurnRatesJob();
  }
}
