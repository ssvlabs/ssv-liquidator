import { Injectable } from '@nestjs/common';
import {
  Web3Provider,
  ERROR_CLUSTER_LIQUIDATED,
} from '@cli/shared/services/web3.provider';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';
import { SystemService, SystemType } from '@cli/modules/system/system.service';
import { CustomLogger } from '@cli/shared/services/logger.service';

@Injectable()
export class BurnRatesTask {
  private static CURRENT_BATCH_SIZE = 100;
  private static BATCH_SIZE_RATIO = 0.9;
  private static MINIMUM_BATCH_SIZE = 10;
  private static isProcessLocked = false;
  private readonly _logger = new CustomLogger(BurnRatesTask.name);

  constructor(
    private _clusterService: ClusterService,
    private _metricsService: MetricsService,
    private _systemService: SystemService,
    private _web3Provider: Web3Provider,
  ) {}

  static get BLOCK_RANGE() {
    return 10;
  }

  /**
   * How many records should be processed per one cron job
   * @private
   */
  private get batchSize(): number {
    return BurnRatesTask.CURRENT_BATCH_SIZE;
  }

  /**
   * When data can not be fetched - decrease batch size
   * @private
   */
  private decreaseBatchSize() {
    // Don't decrease the batch size if it reaches minimum value
    if (BurnRatesTask.CURRENT_BATCH_SIZE <= BurnRatesTask.MINIMUM_BATCH_SIZE) {
      return;
    }
    const previousBatchSize = BurnRatesTask.CURRENT_BATCH_SIZE;
    const previousBatchSizeRatio = BurnRatesTask.BATCH_SIZE_RATIO;

    // Decrease the batch size by 10% every time when called
    BurnRatesTask.CURRENT_BATCH_SIZE = Math.ceil(
      BurnRatesTask.CURRENT_BATCH_SIZE * BurnRatesTask.BATCH_SIZE_RATIO,
    );

    // Increase speed of decreasing batch size every time
    BurnRatesTask.BATCH_SIZE_RATIO = BurnRatesTask.BATCH_SIZE_RATIO * 0.9;

    this._logger.debug(
      `Batch size for burn rate task decreased from ${previousBatchSize} to ${BurnRatesTask.CURRENT_BATCH_SIZE}`,
    );
    this._logger.debug(
      `Batch size ratio for burn rate task decreased from ${previousBatchSizeRatio} to ${BurnRatesTask.BATCH_SIZE_RATIO}`,
    );
  }

  /**
   * If cluster has been updated in worker service it gets the fresh metrics
   * and generate updated cluster profile
   */
  async syncBurnRates(): Promise<void> {
    if (BurnRatesTask.isProcessLocked) {
      this._logger.log(`Process is already locked`);
      return;
    }

    const latestSyncedBlockNumber = await this._systemService.get(
      SystemType.GENERAL_LAST_BLOCK_NUMBER,
    );

    const latestBlockNumber =
      await this._web3Provider.web3.eth.getBlockNumber();

    if (
      latestSyncedBlockNumber + BurnRatesTask.BLOCK_RANGE <
      latestBlockNumber
    ) {
      this._logger.debug(`Ignore task. Events are not fully synced yet.`);
      return;
    }

    try {
      BurnRatesTask.isProcessLocked = true;

      this._metricsService.burnRatesStatus.set(0);

      await this.processBurnRates();

      // Only after full cycle of updates set successful metrics
      this._metricsService.burnRatesStatus.set(1);
    } catch (e) {
      this._logger.error(`Failed to sync burn rates. Error: ${e}`);
    } finally {
      BurnRatesTask.isProcessLocked = false;
    }
  }

  private async processBurnRates(): Promise<void> {
    const missedRecords = (
      await this._clusterService
        .getQueryBuilder()
        .where('cluster.burnRate IS NULL and cluster.isLiquidated == false')
        .take(this.batchSize)
        .getMany()
    ).map(item => {
      try {
        item.cluster = JSON.parse(item.cluster);
      } catch (e) {
        this._logger.error(
          `Can not json parse cluster data from DB! Skipping. Cluster: ${JSON.stringify(
            item,
          )}. Skipping.`,
        );
      }
      return item;
    });
    // Nothing to process
    if (missedRecords.length === 0) {
      this._logger.debug('No clusters with empty burn rate. Done.');
    }

    // Common data for all clusters
    const { collateralAmount, minimumBlocksBeforeLiquidation } =
      await this._fetchCommonData();

    // Iterate over all clusters with missing parts and sync them one by one
    for (const record of missedRecords) {
      const logRecord = JSON.stringify(record);
      const burnRateTask = this._web3Provider.getBurnRate(
        record.owner,
        record.operatorIds,
        record.cluster,
      );
      const balanceTask = this._web3Provider.getBalance(
        record.owner,
        record.operatorIds,
        record.cluster,
      );
      const liquidatedTask = this._web3Provider.isLiquidated(
        record.owner,
        record.operatorIds,
        record.cluster,
      );
      const currentBlockNumberTask = this._web3Provider.currentBlockNumber();

      // Wait for all the parts of cluster data
      this._logger.verbose(
        `Requesting cluster details from contract: ${JSON.stringify(
          logRecord,
        )}`,
      );
      const clusterData: any = await Promise.allSettled([
        burnRateTask,
        balanceTask,
        liquidatedTask,
        currentBlockNumberTask,
      ]).catch(error => {
        this._logger.error(
          `Error occurred during cluster resolution: ${error.message}. Skipping this cluster for now.`,
        );
        return false;
      });

      // Skip in incomplete cluster data
      if (clusterData === false) continue;

      // Extract final data
      const [burnRate, balance, isLiquidated, currentBlockNumber] = clusterData;

      // Build fields object
      const fields = {
        burnRate: burnRate.value,
        balance: balance.value,
        isLiquidated: isLiquidated.value,
        currentBlockNumber: currentBlockNumber.value,
      };

      // Prepare final data
      record.cluster = JSON.stringify(record.cluster);

      this._logger.verbose(`Working with cluster: ${logRecord}`);
      this._logger.verbose(
        `Cluster fresh data from contract: ${JSON.stringify(
          fields,
        )}. Cluster: ${logRecord}`,
      );

      // Check for errors
      const { error, liquidatedError } = this._parseErrors(fields, record);

      // Check specific liquidated error
      if (liquidatedError || fields.isLiquidated === true) {
        // Update cluster to liquidated only if it has no this state before
        if (!record.isLiquidated) {
          const updated = await this._clusterService.update(
            { owner: record.owner, operatorIds: record.operatorIds },
            {
              balance: null,
              burnRate: null,
              isLiquidated: true,
              liquidationBlockNumber: null,
            },
          );
          if (updated) {
            this._logger.debug(
              `Updated cluster to liquidated state: ${logRecord}`,
            );
          } else {
            this._logger.error(
              `Could not update cluster to liquidated state: ${logRecord}`,
            );
          }
        } else {
          this._logger.verbose(
            `Skipping liquidated cluster update because it already liquidated in database: ${logRecord}`,
          );
        }
        continue;
      } else if (error) {
        this._logger.error(
          `${
            error.startsWith('Error:')
              ? error
              : 'Some of the cluster data was not fetched from the contract.'
          }. Skipping for now. Cluster: ${logRecord}`,
        );
        continue;
      }

      // If cluster won't be liquidated, at which block number his balance becomes zero
      // check if burnRate and balance are valid, > 0
      if (
        !Number.isNaN(fields.burnRate) &&
        !Number.isNaN(fields.balance) &&
        fields.burnRate > 0
      ) {
        this._calculateCluster(record, {
          burnRate: fields.burnRate,
          balance: fields.balance,
          isLiquidated: fields.isLiquidated,
          minimumBlocksBeforeLiquidation,
          currentBlockNumber: fields.currentBlockNumber,
          collateralAmount,
        });
        this._logger.verbose(
          `Re-calculated cluster: ${JSON.stringify({
            ...record,
            cluster: JSON.parse(record.cluster),
          })}`,
        );
      } else {
        record.burnRate = fields.burnRate;
        record.balance = fields.balance;
        record.liquidationBlockNumber = null;
        this._logger.verbose(
          `Erased cluster data: ${JSON.stringify({
            ...record,
            cluster: JSON.parse(record.cluster),
          })}`,
        );
      }
      const updated = await this._clusterService.update(
        { owner: record.owner, operatorIds: record.operatorIds },
        record,
      );
      if (updated) {
        this._logger.verbose(
          `Updated cluster: ${JSON.stringify({
            ...record,
            cluster: JSON.parse(record.cluster),
          })}`,
        );
      }
    }
  }

  /**
   * Parse for any errors inside resolved cluster data from the contract.
   * @param fields
   * @param cluster
   * @private
   */
  private _parseErrors(
    fields: Record<string, any>,
    cluster: any,
  ): { error: any; liquidatedError: boolean } {
    let error, liquidatedError;
    for (const clusterField of Object.keys(fields)) {
      if (fields[clusterField]) {
        if (
          fields[clusterField] === undefined ||
          fields[clusterField] === null
        ) {
          error = `Error: Field ${clusterField} was not fetched from the contract`;
          this.decreaseBatchSize();
        } else if (fields[clusterField].error) {
          error = fields[clusterField].error;
          const isLiquidated = this._web3Provider.isError(
            error,
            ERROR_CLUSTER_LIQUIDATED,
          );
          this._logger.debug(
            `Found error in one of cluster fields "${clusterField}": ${JSON.stringify(
              fields[clusterField],
            )}. Cluster: ${JSON.stringify(cluster)}. ${
              isLiquidated
                ? 'Cluster will be marked as liquidated if not yet'
                : ''
            }`,
          );
          liquidatedError = liquidatedError || isLiquidated;
        }
      }
    }
    return {
      error,
      liquidatedError,
    };
  }

  /**
   * Fetch some common data from the contract to use later for calculations
   * @private
   */
  private async _fetchCommonData(): Promise<{
    collateralAmount: number;
    minimumBlocksBeforeLiquidation: number;
  }> {
    this._logger.log(
      'Fetching from the contract minimum liquidation collateral..',
    );
    const collateralAmount =
      +(await this._web3Provider.getMinimumLiquidationCollateral());
    this._logger.log(
      `Fetched from the contract minimum liquidation collateral: ${collateralAmount}`,
    );

    this._logger.log(
      'Fetching from the contract minimum blocks before liquidation..',
    );
    const minimumBlocksBeforeLiquidation =
      await this._web3Provider.getLiquidationThresholdPeriod();
    this._logger.log(
      `Fetched from the contract minimum blocks before liquidation: ${minimumBlocksBeforeLiquidation}`,
    );
    return {
      collateralAmount,
      minimumBlocksBeforeLiquidation,
    };
  }

  private _calculateCluster(
    record,
    {
      balance,
      burnRate,
      isLiquidated,
      minimumBlocksBeforeLiquidation,
      currentBlockNumber,
      collateralAmount,
    },
  ): void {
    record.balance = balance;
    record.burnRate = burnRate;
    record.isLiquidated = isLiquidated;

    // Get liquidation block number based on liquidationThresholdPeriod
    const liquidationThresholdBlock =
      currentBlockNumber +
      record.balance / record.burnRate -
      minimumBlocksBeforeLiquidation;

    // Get liquidation block number based on liquidationCollateralAmount
    const liquidationCollateralBlock =
      currentBlockNumber +
      (record.balance - collateralAmount) / record.burnRate;

    record.liquidationBlockNumber = Math.min(
      liquidationThresholdBlock,
      liquidationCollateralBlock,
    );

    /*
    // Calculate in which block the cluster will start to be ready for liquidation
    const liveUntilBlockByBalance =
      currentBlockNumber +
      record.balance / record.burnRate -
      minimumBlocksBeforeLiquidation;

    // Calculate balance at the block when the cluster will start to be ready for liquidation
    const latestLiveBlockBalance =
      record.balance -
      (liveUntilBlockByBalance - currentBlockNumber) * record.burnRate;

    if (record.balance <= collateralAmount) {
      // If balance less than minimum collateral amount set a flag to liquidate asap
      record.liquidationBlockNumber = currentBlockNumber;
    } else if (latestLiveBlockBalance < collateralAmount) {
      // If balance at the block when the cluster will start to be ready for liquidation
      // less than minimum collateral amount, set the block when need to liquidate that to get at least minimum collateral amount
      record.liquidationBlockNumber =
        currentBlockNumber +
        (record.balance - collateralAmount) / record.burnRate;
    } else {
      // If balance at the block when the cluster will start to be ready for liquidation
      // more or equal than minimum collateral amount, set the block when need to liquidate by actual balance
      record.liquidationBlockNumber = liveUntilBlockByBalance;
    }
    */
  }
}
