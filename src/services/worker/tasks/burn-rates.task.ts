import { Injectable } from '@nestjs/common';
import Web3Provider from '@cli/providers/web3.provider';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';
import SolidityErrors from '@cli/providers/solidity-errors.provider';

@Injectable()
export class BurnRatesTask {
  private static isProcessLocked = false;

  constructor(
    private _clusterService: ClusterService,
    private _metricsService: MetricsService,
  ) {}

  /**
   * If cluster has been updated in worker service it gets the fresh metrics
   * and generate updated cluster profile
   */
  async syncBurnRates(): Promise<void> {
    if (BurnRatesTask.isProcessLocked) {
      console.debug(`BurnRatesTask process is already locked.`);
      return;
    }
    BurnRatesTask.isProcessLocked = true;

    const missedRecords = (
      await this._clusterService.findBy({
        where: { burnRate: null },
      })
    ).map(item => {
      try {
        item.cluster = JSON.parse(item.cluster);
      } catch (e) {
        console.error(`Can not json parse cluster data from DB! Skipping.`);
      }
      return item;
    });

    const burnRates = await Promise.allSettled(
      missedRecords.map(record =>
        Web3Provider.getWithRetry(Web3Provider.getBurnRate, [
          record.owner,
          record.operatorIds,
          record.cluster,
        ]),
      ),
    );

    const balances = await Promise.allSettled(
      missedRecords.map(record =>
        Web3Provider.getWithRetry(Web3Provider.getBalance, [
          record.owner,
          record.operatorIds,
          record.cluster,
        ]),
      ),
    );

    const liquidated = await Promise.allSettled(
      missedRecords.map(record =>
        Web3Provider.getWithRetry(Web3Provider.isLiquidated, [
          record.owner,
          record.operatorIds,
          record.cluster,
        ]),
      ),
    );

    const aggrs = missedRecords.map((item, index) => ({
      burnRate: burnRates[index] as any,
      balance: balances[index] as any,
      isLiquidated: liquidated[index] as any,
    }));

    const minimumBlocksBeforeLiquidation =
      await Web3Provider.minimumBlocksBeforeLiquidation();
    const currentBlockNumber = await Web3Provider.currentBlockNumber();

    for (const [index, record] of missedRecords.entries()) {
      // Prepare final data
      record.cluster = JSON.stringify(record.cluster);
      const clusterError =
        aggrs[index].burnRate.error || aggrs[index].balance.error;
      if (
        (clusterError &&
          SolidityErrors.isError(clusterError, 'ClusterIsLiquidated')) ||
        aggrs[index].isLiquidated.value
      ) {
        await this._clusterService.update(
          {
            owner: record.owner,
            operatorIds: record.operatorIds,
          },
          {
            balance: null,
            burnRate: null,
            isLiquidated: true,
            liquidationBlockNumber: null,
          },
        );
        continue;
      }

      const burnRate = aggrs[index].burnRate.value;
      const balance = aggrs[index].balance.value;
      const isLiquidated = aggrs[index].isLiquidated.value;
      // If cluster won't be liquidated, at which block number his balance becomes zero
      // check if burnRate and balance are valid, > 0
      if (!Number.isNaN(burnRate) && !Number.isNaN(balance)) {
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

        // Get minimum collateral amount (in SSV)
        const collateralAmount =
          +(await Web3Provider.getMinimumLiquidationCollateral());

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
      } else {
        record.burnRate = null;
        record.balance = null;
        record.liquidationBlockNumber = null;
      }

      await this._clusterService.update(
        { owner: record.owner, operatorIds: record.operatorIds },
        record,
      );
    }
    // Only after full cycle of updates set successful metrics
    this._metricsService.burnRatesStatus.set(1);
    this._metricsService.criticalStatus.set(1);

    /*
    try {
      console.log(1);
      const missedRecords = (
        await this._clusterService.findBy({
          where: { burnRate: null },
        })
      )
        .map(item => {
          try {
            item.cluster = JSON.parse(item.cluster);
          } catch (e) {
            console.error(`Can not json parse cluster data from DB! Skipping.`);
          }
          return item;
        })
        .filter(item => item.cluster);

      console.log(2);
      // Fetch it once before one cycle
      const minimumBlocksBeforeLiquidation =
        await Web3Provider.minimumBlocksBeforeLiquidation();
      console.log(3);
      for (const [, record] of missedRecords.entries()) {
        console.log(31);
        // Cluster burn rate
        await this._atomicRetry(
          async () =>
            Web3Provider.getBurnRate(
              record.owner,
              record.operatorIds,
              record.cluster,
            ),
          async (result: any) => {
            result = +result;
            if (Number.isNaN(result)) {
              throw new Error(`Failed to fetch burn rate`);
            }
            // How many SSV cluster burns in one block
            record.burnRate = result;
          },
          async (result: AtomicRetryFailedResult) => {
            throw new Error(
              `Web3Provider.getBurnRate failed: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );
        console.log(32);
        // Cluster balance
        await this._atomicRetry(
          async () =>
            Web3Provider.getBalance(
              record.owner,
              record.operatorIds,
              record.cluster,
            ),
          async (result: any) => {
            const balance = result.includes('InsufficientFunds') ? 0 : +result;
            if (Number.isNaN(balance)) {
              throw new Error('Failed to fetch balance');
            }
            record.balance = balance;
          },
          async (result: AtomicRetryFailedResult) => {
            if (
              result.solidityError &&
              this._solidityErrorsService.isError(
                result.solidityError,
                'ClusterIsLiquidated',
              )
            ) {
              await this._clusterService.update(
                {
                  owner: record.owner,
                  operatorIds: record.operatorIds,
                },
                {
                  isLiquidated: true,
                },
              );
              console.error(
                `Marked cluster as liquidated and skipping it: ${JSON.stringify(
                  { ...record, isLiquidated: true },
                )}`,
                `. Reason: ${JSON.stringify({
                  result,
                  record,
                })}`,
              );
              return;
            }
            throw new Error(
              `Web3Provider.getBalance failed: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );

        console.log(33);
        // Cluster liquidated state
        await this._atomicRetry(
          async () =>
            Web3Provider.isLiquidated(
              record.owner,
              record.operatorIds,
              record.cluster,
            ),
          async (result: boolean) => {
            if (typeof result !== 'boolean') {
              throw new Error('Failed to fetch liquidated status');
            }
            record.isLiquidated = result;
          },
          async (result: AtomicRetryFailedResult) => {
            throw new Error(
              `Web3Provider.isLiquidated failed: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );

        console.log(34);
        // Current block number
        let currentBlockNumber: number = null;
        await this._atomicRetry(
          async () => Web3Provider.currentBlockNumber(),
          async (result: any) => {
            if (!Number.isInteger(result)) {
              throw new Error('Failed to fetch current block number');
            }
            currentBlockNumber = result;
          },
          async (result: AtomicRetryFailedResult) => {
            throw new Error(
              `Web3Provider.currentBlockNumber failed: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );

        console.log(35);
        // Prepare final data
        record.cluster = JSON.stringify(record.cluster);
        // If cluster won't be liquidated, at which block number his balance becomes zero
        // check if burnRate and balance are valid, > 0
        if (record.burnRate > 0 && record.balance > 0) {
          // Calculate in which block the cluster will start to be ready for liquidation
          const liveUntilBlockByBalance =
            currentBlockNumber +
            record.balance / record.burnRate -
            minimumBlocksBeforeLiquidation;

          // Calculate balance at the block when the cluster will start to be ready for liquidation
          const latestLiveBlockBalance =
            record.balance -
            (liveUntilBlockByBalance - currentBlockNumber) * record.burnRate;

          // Get minimum collateral amount (in SSV)
          const collateralAmount =
            +(await Web3Provider.getMinimumLiquidationCollateral());

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
        } else {
          record.liquidationBlockNumber = null;
        }

        console.log(36);
        // Save cluster updated data to database
        await this._atomicRetry(
          async () => {
            return await this._clusterService.update(
              { owner: record.owner, operatorIds: record.operatorIds },
              record,
            );
          },
          null,
          async (result: AtomicRetryFailedResult) => {
            throw new Error(
              `Failed to update cluster db record: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );
      }
      console.log(37);
      // Only after full cycle of updates set successful metrics
      this._metricsService.burnRatesStatus.set(1);
      this._metricsService.criticalStatus.set(1);
    } catch (e) {
      throw e;
    } finally {
      BurnRatesTask.isProcessLocked = false;
    }
    */

    BurnRatesTask.isProcessLocked = false;
  }

  /**
   * Making atomic async call for the cases when rate limits doesn't allow
   * to process all the list of burn rate tasks.
   * For one cluster it makes many calls to get burn rate info resolved.
   * If there is many clusters - all of them failing when any info fetching
   * fails because of rate limit.
   *
   * @param asyncCall
   * @param asyncCallback
   * @param asyncFailed
   * @param maxRetries
   * @param retryDelayMs
   * @private
   */
  /*
  private async _atomicRetry(
    asyncCall: any,
    asyncCallback: any = null,
    asyncFailed: any = null,
    maxRetries = 10,
    retryDelayMs = 1000,
  ) {
    for (let retry = 1; retry <= maxRetries; retry += 1) {
      asyncCallback = asyncCallback || (() => void 0);
      asyncFailed = asyncFailed || (() => void 0);
      try {
        await asyncCallback(await asyncCall());
        break;
      } catch (error) {
        let solidityError: SolidityError = null;
        if (String(error.data).startsWith('0x')) {
          solidityError = this._solidityErrorsService.getErrorByHash(
            error.data,
          );
        }
        await asyncFailed({
          error,
          solidityError,
          retry,
          maxRetries,
        });
        await new Promise(resolve =>
          setTimeout(() => resolve(true), retryDelayMs),
        );
      }
    }
  }
  */
}
