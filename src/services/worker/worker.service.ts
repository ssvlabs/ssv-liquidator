import { Injectable, Logger } from '@nestjs/common';

import Web3Provider from '@cli/providers/web3.provider';

import { SystemService, SystemType } from '@cli/modules/system/system.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { EarningService } from '@cli/modules/earnings/earning.service';

@Injectable()
export class WorkerService {
  private readonly _logger = new Logger(WorkerService.name);

  constructor(
    private _clusterService: ClusterService,
    private _earningService: EarningService,
    private _systemService: SystemService,
  ) {}

  async processEvents(events: Array<any>): Promise<void> {
    if (!events.length) {
      this._logger.log(`There is no events in this block range`);
      return;
    }
    this._logger.log(`Going to process ${events.length} events`);
    for (const item of events) {
      if (!Object.values(SystemType).includes(item.event)) continue;
      const dataItem: any = this._convert(item.returnValues);
      dataItem.cluster = JSON.stringify(dataItem.cluster);
      dataItem.blockNumber = item.blockNumber;

      switch (item.event) {
        case SystemType.EVENT_CLUSTER_LIQUIDATED:
          const earnedData = await this._earningService.fetch(
            item.transactionHash,
          );
          await this._earningService.update(earnedData);
        case SystemType.EVENT_CLUSTER_DEPOSITED:
        case SystemType.EVENT_CLUSTER_WITHDRAWN:
        case SystemType.EVENT_CLUSTER_REACTIVATED:
        case SystemType.EVENT_OPERATOR_FEE_APPROVED:
        case SystemType.EVENT_VALIDATOR_REMOVED:
          // mark as cluster was updated and need to get it's fresh metrics in burn-rates task
          await this._clusterService.update(
            {
              owner: dataItem.owner,
              operatorIds: dataItem.operatorIds,
            },
            { burnRate: null, cluster: dataItem.cluster },
          );
          break;
        case SystemType.EVENT_VALIDATOR_ADDED:
          await this._clusterService.create(dataItem);
          break;
        case SystemType.EVENT_COLLATERAL_UPDATED:
          await this._systemService.save(
            SystemType.MINIMUM_LIQUIDATION_COLLATERAL,
            await Web3Provider.getMinimumLiquidationCollateral(),
          );
          break;
      }
    }
  }

  /*
    struct array of values into key -> value object format
  */
  private _convert(values): any {
    return Object.keys(values).reduce((aggr, key) => {
      if (isNaN(key as any)) {
        if (key === 'cluster') {
          aggr[key] = this._convert(values[key]);
        } else {
          aggr[key] = values[key];
        }
      }
      return aggr;
    }, {});
  }
}
