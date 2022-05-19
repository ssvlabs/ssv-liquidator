import Web3Provider from '@cli/providers/web3.provider';

import { Injectable } from '@nestjs/common';
import { AddressService } from '@cli/modules/addresses/address.service';

@Injectable()
export class BurnRatesTask {
  constructor(private _addressService: AddressService) {}

  async syncBurnRates(): Promise<void> {
    const missedRecords = await this._addressService.findBy({
      where: { burnRate: null },
      select: ['ownerAddress'],
    });
    const burnRates = await Promise.allSettled(
      missedRecords.map(({ ownerAddress }) =>
        Web3Provider.burnRate(ownerAddress),
      ),
    );
    const balances = await Promise.allSettled(
      missedRecords.map(({ ownerAddress }) =>
        Web3Provider.totalBalanceOf(ownerAddress),
      ),
    );
    const liquidated = await Promise.allSettled(
      missedRecords.map(({ ownerAddress }) =>
        Web3Provider.isLiquidated(ownerAddress),
      ),
    );
    for (const [index, record] of missedRecords.entries()) {
      const burnRate = +(burnRates[index] as any).value;
      const balanceObject = balances[index] as any;
      const balance =
        balanceObject.status === 'rejected' &&
        balanceObject.reason.toString().includes('negative balance')
          ? 0
          : +balanceObject.value;
      const isLiquidated = (liquidated[index] as any).value;
      record.burnRate = burnRate;
      record.liquidateAtBlock =
        burnRate > 0
          ? (await Web3Provider.currentBlockNumber()) +
            +(balance / burnRate).toFixed(0)
          : null;
      record.isLiquidated = isLiquidated;
    }
    await Promise.all(
      missedRecords.map(record =>
        this._addressService.update(
          { ownerAddress: record.ownerAddress },
          record,
        ),
      ),
    );
  }
}
