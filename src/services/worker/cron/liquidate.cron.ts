import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { QueueService } from '../../../queues/queue.service';

@Injectable()
export class LiquidateCron {
  constructor(
    private _queuesService: QueueService,
  ) {}

  @Cron('0 * * * * *')
  async liquidate(): Promise<void> {
    await this._queuesService.liquidateJob();
  }
}
