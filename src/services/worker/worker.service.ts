import { In } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { SystemType } from '@cli/modules/system/system.service';

import { AddressService } from '@cli/modules/addresses/address.service';
import { EarningService } from '@cli/modules/earnings/earning.service';

@Injectable()
export class WorkerService {
  protected _convert: any;

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
    console.log(`going to process events...`, events.length);
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
      /*
      if (
        item.event === SystemType.EVENT_ACCOUNT_LIQUIDATED ||
        item.event === SystemType.EVENT_FUNDS_DEPOSITED ||
        item.event === SystemType.EVENT_FUNDS_WITHDRAWN ||
        item.event === SystemType.EVENT_OPERATOR_FEE_APPROVED ||
        item.event === SystemType.EVENT_VALIDATOR_REMOVED
      ) {
        await this._addressService.update(
          { ownerAddress: dataItem.ownerAddress },
          { burnRate: null },
        );
      } else if (item.event === SystemType.EVENT_OPERATOR_FEE_APPROVED) {
        await this._addressService.update(
          { operatorIds: In(dataItem.operatorId) },
          { burnRate: null },
        );
      } else if (item.event === SystemType.EVENT_VALIDATOR_ADDED) {
        await this._addressService.create([dataItem]);
      }
      */
    }
  }
}
