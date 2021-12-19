import { Injectable } from '@nestjs/common';

import { QueueService } from '../../../queues/queue.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ValidatorCron {
  constructor(
    private _queuesService: QueueService,
  ) {}

  @Cron('0 * * * * *')
  async fetchNewValidators(): Promise<void> {
    await this._queuesService.fetchNewValidatorsJob();
  }

  @Cron('0 * * * * *')
  async fetchUpdatedValidators(): Promise<void> {
    await this._queuesService.fetchUpdatedValidatorsJob();
  }
}
