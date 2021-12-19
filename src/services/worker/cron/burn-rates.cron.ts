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
  async syncBurnRates(): Promise<void> {
    await this._queuesService.syncBurnRatesJob();
  }

  @Cron('0 * * * * *')
  async syncLiquidatedAddresses(): Promise<void> {
    await this._queuesService.syncLiquidatedAddressesJob();
  }

  @Cron('0 * * * * *')
  async syncDeposits(): Promise<void> {
    await this._queuesService.syncDepositsJob();
  }

  @Cron('0 * * * * *')
  async syncWithdraws(): Promise<void> {
    await this._queuesService.syncWithdrawsJob();
  }
}
