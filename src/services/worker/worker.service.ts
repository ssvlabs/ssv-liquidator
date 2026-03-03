import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SystemService, SystemType } from '@cli/modules/system/system.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { EarningService } from '@cli/modules/earnings/earning.service';

import { Web3Provider } from '@cli/shared/services/web3.provider';
import { ConfService } from '@cli/shared/services/conf.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly _logger = new Logger(WorkerService.name);

  constructor(
    private _clusterService: ClusterService,
    private _earningService: EarningService,
    private _systemService: SystemService,
    private _web3Provider: Web3Provider,
    private _config: ConfService,
  ) {}

  async onModuleInit() {
    await this._systemService.save(
      SystemType.MINIMUM_LIQUIDATION_COLLATERAL,
      await this._web3Provider.getMinimumLiquidationCollateral(),
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
          if (!earnedData) continue;
          await this._earningService.update(earnedData);
          this._logger.debug(
            `Updated earned data after cluster liquidation: ${JSON.stringify(
              dataItem,
            )}`,
          );
          (await this._clusterService.update(
            {
              owner: dataItem.owner,
              operatorIds: dataItem.operatorIds,
            },
            { burnRate: null, isLiquidated: true, cluster: dataItem.cluster },
          )) &&
            this._logger.debug(`Updated cluster: ${JSON.stringify(dataItem)}`);
          break;
        case SystemType.EVENT_CLUSTER_REACTIVATED:
          const cutoffBlockReactivated = this._config.get(
            'SSV_CLUSTER_MIGRATION_BLOCK',
          );
          if (
            cutoffBlockReactivated &&
            dataItem.blockNumber >= cutoffBlockReactivated
          ) {
            // Check if cluster exists
            const existing = await this._clusterService.findBy({
              where: {
                owner: dataItem.owner,
                operatorIds: dataItem.operatorIds,
              },
            });
            if (existing && existing.length > 0) {
              (await this._clusterService.update(
                {
                  owner: dataItem.owner,
                  operatorIds: dataItem.operatorIds,
                },
                {
                  burnRate: null,
                  isLiquidated: false,
                  cluster: dataItem.cluster,
                },
              )) &&
                this._logger.debug(
                  `Updated cluster: ${JSON.stringify(dataItem)}`,
                );
            } else {
              await this._clusterService.create(dataItem);
            }
          }

          break;
        case SystemType.EVENT_CLUSTER_DEPOSITED:
        case SystemType.EVENT_CLUSTER_WITHDRAWN:
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
          const toUpdateAsOperatorFeeUpdated = await this._clusterService
            .getQueryBuilder()
            .where(
              `isLiquidated == false and (instr(operatorIds, ',${dataItem.operatorId},') > 0 OR instr(operatorIds, '${dataItem.operatorId},') = 1 OR instr(operatorIds, ',${dataItem.operatorId}') > 0)`,
            )
            .getMany();
          for (const item of toUpdateAsOperatorFeeUpdated) {
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
              this._logger.debug(
                `[operator fee updated] Updated cluster: ${JSON.stringify(
                  item,
                )}`,
              );
          }
          break;
        case SystemType.EVENT_VALIDATOR_ADDED:
          const cutoffBlock = this._config.get('SSV_CLUSTER_MIGRATION_BLOCK');
          if (cutoffBlock && dataItem.blockNumber >= cutoffBlock) {
            await this._clusterService.create(dataItem);
          } else {
            this._logger.debug(
              `Skipped SSV cluster (block ${dataItem.blockNumber} < cutoff ${cutoffBlock})`,
            );
          }
          break;
        case SystemType.EVENT_CLUSTER_MIGRATED_TO_ETH:
          // Create new cluster entry for ETH cluster from SSV cluster migration
          this._logger.debug(
            `Creating new ETH cluster from migrated SSV cluster: ${JSON.stringify(
              dataItem,
            )}`,
          );
          await this._clusterService.create(dataItem);
          break;
        case SystemType.EVENT_CLUSTER_BALANCE_UPDATED:
          // Update cluster with new effective balance and balance
          (await this._clusterService.update(
            {
              owner: dataItem.owner,
              operatorIds: dataItem.operatorIds,
            },
            {
              balance: dataItem.balance,
              burnRate: null,
              cluster: dataItem.cluster,
            },
          )) &&
            this._logger.debug(
              `Updated cluster effective balance: ${JSON.stringify(dataItem)}`,
            );
          break;
        case SystemType.EVENT_COLLATERAL_UPDATED:
          await this._systemService.save(
            SystemType.MINIMUM_LIQUIDATION_COLLATERAL,
            await this._web3Provider.getMinimumLiquidationCollateral(),
          );
          this._logger.debug(
            `Updated minimum liquidation collateral: ${JSON.stringify(
              dataItem,
            )}`,
          );
          // TO-DO update clusters as well ?
          break;
        case SystemType.EVENT_LIQUIDATION_THRESHOLD_PERIOD_UPDATED:
          await this._systemService.save(
            SystemType.LIQUIDATION_THRESHOLD_PERIOD,
            await this._web3Provider.getLiquidationThresholdPeriod(),
          );
          this._logger.debug(
            `Updated liquidation threshold period: ${JSON.stringify(dataItem)}`,
          );
          const toUpdateAsThresholdUpated = await this._clusterService
            .getQueryBuilder()
            .where('isLiquidated == false')
            .getMany();
          for (const item of toUpdateAsThresholdUpated) {
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
              this._logger.debug(
                `[threshold period updated] updated cluster: ${JSON.stringify(
                  item,
                )}`,
              );
          }
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
