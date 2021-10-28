import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AddressService } from '../../../modules/addresses/address.service';
import { QueueService } from '../../../queues/queue.service';

@Injectable()
export class BurnRateCron {
  constructor(
    private _addressService: AddressService,
    private _queuesService: QueueService,
  ) {}

  @Cron('0 * * * * *')
  async update(): Promise<void> {
    await this._queuesService.syncBurnRatesJob();
  }
}
