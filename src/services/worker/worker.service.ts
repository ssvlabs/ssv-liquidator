import { In } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { SystemType } from '@cli/modules/system/system.service';
import { AddressService } from '@cli/modules/addresses/address.service';
import { EarningService } from '@cli/modules/earnings/earning.service';

@Injectable()
export class WorkerService {
  protected _convert: any;
  private readonly _logger = new Logger(WorkerService.name);

  constructor(
    private _addressService: AddressService,
    private _earningService: EarningService,
  ) {
    this._convert = (values): any =>
      Object.keys(values).reduce((aggr, key) => {
        if (isNaN(key as any)) {
          aggr[key] = values[key];
        }
        return aggr;
      }, {});
  }

  async processEvents(events: Array<any>): Promise<void> {
    if (!events.length) {
      this._logger.log(`There is no events in this block range`);
      return;
    }
    this._logger.log(`Going to process ${events.length} events`);
    for (const item of events) {
      const dataItem: any = this._convert(item.returnValues);
      dataItem.blockNumber = item.blockNumber;

      switch (item.event) {
        case SystemType.EVENT_ACCOUNT_LIQUIDATED:
          const earnedData = await this._earningService.fetch(
            item.transactionHash,
          );
          await this._earningService.update(earnedData);
        case SystemType.EVENT_FUNDS_DEPOSITED:
        case SystemType.EVENT_FUNDS_WITHDRAWN:
        case SystemType.EVENT_OPERATOR_FEE_APPROVED:
        case SystemType.EVENT_VALIDATOR_REMOVED:
          await this._addressService.update(
            { ownerAddress: dataItem.ownerAddress },
            { burnRate: null },
          );
          break;
        case SystemType.EVENT_OPERATOR_FEE_APPROVED:
          await this._addressService.update(
            { operatorIds: In(dataItem.operatorId) },
            { burnRate: null },
          );
          break;
        case SystemType.EVENT_VALIDATOR_ADDED:
          await this._addressService.create([dataItem]);
          break;
      }
    }
  }
}
