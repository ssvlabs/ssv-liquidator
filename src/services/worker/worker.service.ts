import Web3Provider from '@cli/providers/web3.provider';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SystemService, SystemType } from '@cli/modules/system/system.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { EarningService } from '@cli/modules/earnings/earning.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly _logger = new Logger(WorkerService.name);

  constructor(
    private _clusterService: ClusterService,
    private _earningService: EarningService,
    private _systemService: SystemService,
  ) {}

  async onModuleInit() {
    await this._systemService.save(
      SystemType.MINIMUM_LIQUIDATION_COLLATERAL,
      await Web3Provider.getMinimumLiquidationCollateral(),
    );
  }

  async processEvents(events: Array<any>): Promise<void> {
    if (!events.length) {
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
          this._logger.debug(
            `Updated earned data after cluster liquidation: ${JSON.stringify(
              dataItem,
            )}`,
          );
        case SystemType.EVENT_CLUSTER_DEPOSITED:
        case SystemType.EVENT_CLUSTER_WITHDRAWN:
        case SystemType.EVENT_CLUSTER_REACTIVATED:
        case SystemType.EVENT_VALIDATOR_REMOVED:
          // /Mark as cluster was updated and need to get
          // its fresh metrics in burn-rates task
          (await this._clusterService.update(
            {
              owner: dataItem.owner,
              operatorIds: dataItem.operatorIds,
            },
            { burnRate: null, isLiquidated: false, cluster: dataItem.cluster },
          )) &&
            this._logger.debug(`Updated cluster: ${JSON.stringify(dataItem)}`);
          break;
        case SystemType.EVENT_OPERATOR_FEE_APPROVED:
          // /Mark as cluster was updated and need to get
          // its fresh metrics in burn-rates task
          const items = await this._clusterService
            .getQueryBuilder()
            .where(
              `isLiquidated == false and (instr(operatorIds, ',${dataItem.operatorId},') > 0 OR instr(operatorIds, '${dataItem.operatorId},') = 1 OR instr(operatorIds, ',${dataItem.operatorId}') > 0)`,
            )
            .getMany();
          for (const item of items) {
            (await this._clusterService.update(
              {
                owner: item.owner,
                operatorIds: item.operatorIds,
              },
              {
                burnRate: null,
                isLiquidated: false,
                cluster: item.cluster,
              },
            )) &&
              this._logger.debug(`Updated cluster: ${JSON.stringify(item)}`);
          }
          break;
        case SystemType.EVENT_VALIDATOR_ADDED:
          await this._clusterService.create(dataItem);
          break;
        case SystemType.EVENT_COLLATERAL_UPDATED:
          await this._systemService.save(
            SystemType.MINIMUM_LIQUIDATION_COLLATERAL,
            await Web3Provider.getMinimumLiquidationCollateral(),
          );
          this._logger.debug(
            `Updated minimum liquidation collateral: ${JSON.stringify(
              dataItem,
            )}`,
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
