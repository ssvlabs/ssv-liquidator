import { IsNull } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import Web3Provider from '@cli/providers/web3.provider';
import { ConfService } from '@cli/shared/services/conf.service';
import SolidityErrors from '@cli/providers/solidity-errors.provider';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';

@Injectable()
export class BurnRatesTask {
  private static CURRENT_BATCH_SIZE = 100;
  private static BATCH_SIZE_RATIO = 0.9;
  private static MINIMUM_BATCH_SIZE = 10;
  private static isProcessLocked = false;
  private readonly _logger = new Logger(BurnRatesTask.name);

  constructor(
    private _clusterService: ClusterService,
    private _metricsService: MetricsService,
    private _config: ConfService,
  ) {}

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

    try {
      BurnRatesTask.isProcessLocked = true;

      this._metricsService.burnRatesStatus.set(0);
      this._metricsService.criticalStatus.set(0);

      await this.processBurnRates();

      // Only after full cycle of updates set successful metrics
      this._metricsService.burnRatesStatus.set(1);
      this._metricsService.criticalStatus.set(1);
    } catch (e) {
      this._logger.error(`Failed to sync burn rates. Error: ${e}`);
    } finally {
      BurnRatesTask.isProcessLocked = false;
    }
  }

  private async processBurnRates(): Promise<void> {
    const missedRecords = (
      await this._clusterService.findBy({
        where: { burnRate: IsNull() },
        take: this.batchSize,
      })
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
      const burnRateTask = Web3Provider.getWithRetry(Web3Provider.getBurnRate, [
        record.owner,
        record.operatorIds,
        record.cluster,
      ]);
      const balanceTask = Web3Provider.getWithRetry(Web3Provider.getBalance, [
        record.owner,
        record.operatorIds,
        record.cluster,
      ]);
      const liquidatedTask = Web3Provider.getWithRetry(
        Web3Provider.isLiquidated,
        [record.owner, record.operatorIds, record.cluster],
      );

      const currentBlockNumberTask = Web3Provider.getWithRetry(
        Web3Provider.currentBlockNumber,
      );

      // Wait for all the parts of cluster data
      this._logger.verbose(
        `Requesting cluster details from contract: ${JSON.stringify(record)}`,
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

      this._logger.verbose(`Working with cluster: ${JSON.stringify(record)}`);
      this._logger.verbose(
        `Cluster fresh data from contract: ${JSON.stringify(fields)}`,
      );

      // Check for errors
      let clusterError = null;
      let isLiquidatedError = false;
      for (const clusterField of Object.keys(fields)) {
        if (fields[clusterField]) {
          if (
            fields[clusterField] === undefined ||
            fields[clusterField] === null
          ) {
            clusterError = `Error: Field ${clusterField} was not fetched from the contract`;
            this.decreaseBatchSize();
          } else if (fields[clusterField].error) {
            clusterError = fields[clusterField].error;
            const isLiquidated = SolidityErrors.isError(
              clusterError,
              SolidityErrors.ERROR_CLUSTER_LIQUIDATED,
            );
            this._logger.debug(
              `Found error in one of cluster fields "${clusterField}": ${JSON.stringify(
                fields[clusterField],
              )}. Cluster: ${JSON.stringify(record)}. ${
                isLiquidated
                  ? 'Cluster will be marked as liquidated if not yet'
                  : ''
              }`,
            );
            isLiquidatedError = isLiquidatedError || isLiquidated;
          }
        }
      }

      // Check specific liquidated error
      if (isLiquidatedError || fields.isLiquidated === true) {
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
              `Updated cluster to liquidated state: ${JSON.stringify(record)}`,
            );
          } else {
            this._logger.error(
              `Could not update cluster to liquidated state: ${JSON.stringify(
                record,
              )}`,
            );
          }
        } else {
          this._logger.verbose(
            `Skipping liquidated cluster update because it already liquidated in database: ${JSON.stringify(
              record,
            )}`,
          );
        }
        continue;
      } else if (clusterError) {
        this._logger.error(
          `${
            clusterError.startsWith('Error:')
              ? clusterError
              : 'Some of the cluster data was not fetched from the contract.'
          }. Skipping for now. Cluster: ${JSON.stringify(record)}`,
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
        this._logger.verbose(`Calculating cluster: ${JSON.stringify(record)}`);
        this._calc(record, {
          burnRate: fields.burnRate,
          balance: fields.balance,
          isLiquidated: fields.isLiquidated,
          minimumBlocksBeforeLiquidation,
          currentBlockNumber: fields.currentBlockNumber,
          collateralAmount,
        });
      } else {
        this._logger.verbose(`Erasing cluster data: ${JSON.stringify(record)}`);
        record.burnRate = null;
        record.balance = null;
        record.liquidationBlockNumber = null;
      }
      const updated = await this._clusterService.update(
        { owner: record.owner, operatorIds: record.operatorIds },
        record,
      );
      if (updated) {
        this._logger.verbose(
          `Updated cluster burn rate: ${JSON.stringify(record)}`,
        );
      }
    }
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
    const collateralAmount = +(await Web3Provider.getWithRetry(
      Web3Provider.getMinimumLiquidationCollateral,
    ));
    this._logger.log(
      `Fetched from the contract minimum liquidation collateral: ${collateralAmount}`,
    );

    this._logger.log(
      'Fetching from the contract minimum blocks before liquidation..',
    );
    const minimumBlocksBeforeLiquidation = await Web3Provider.getWithRetry(
      Web3Provider.minimumBlocksBeforeLiquidation,
    );
    this._logger.log(
      `Fetched from the contract minimum blocks before liquidation: ${minimumBlocksBeforeLiquidation}`,
    );
    return {
      collateralAmount,
      minimumBlocksBeforeLiquidation,
    };
  }

  private _calc(
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
  }
}
