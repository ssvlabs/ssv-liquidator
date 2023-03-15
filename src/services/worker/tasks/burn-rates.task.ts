import { Injectable } from '@nestjs/common';
import { BackOffPolicy, Retryable } from 'typescript-retry-decorator';
import Web3Provider from '@cli/providers/web3.provider';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import {
  MetricsService,
  burnRatesStatus,
  criticalStatus,
} from '@cli/modules/webapp/metrics/services/metrics.service';

type AtomicRetryFailedResult = {
  error: any;
  retry: number;
  maxRetries: number;
};

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
  @Retryable({
    maxAttempts: 100,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    doRetry: (e: Error) => {
      console.error(
        '[CRITICAL] Error running BurnRatesTask :: syncBurnRates: ',
        e,
      );
      burnRatesStatus.set(0);
      criticalStatus.set(0);
      return true;
    },
    exponentialOption: {
      maxInterval: 1000 * 60,
      multiplier: 2,
    },
  })
  async syncBurnRates(): Promise<void> {
    if (BurnRatesTask.isProcessLocked) {
      console.debug(`BurnRatesTask process is already locked.`);
    }

    BurnRatesTask.isProcessLocked = true;

    try {
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

      // Fetch it once before one cycle
      const minimumBlocksBeforeLiquidation =
        await Web3Provider.minimumBlocksBeforeLiquidation();

      for (const [, record] of missedRecords.entries()) {
        // Cluster burn rate
        await this._atomicRetry(
          async () =>
            Web3Provider.getClusterBurnRate(
              record.owner,
              record.operatorIds,
              record.cluster,
            ),
          async (result: any) => {
            result = +result;
            if (Number.isNaN(result)) {
              throw new Error(`Failed to fetch burn rate`);
            }
            record.burnRate = result;
          },
          async (result: AtomicRetryFailedResult) => {
            throw new Error(
              `BurnRatesTask::syncBurnRates: Error: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );

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
            throw new Error(
              `BurnRatesTask::syncBurnRates: Error: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );

        // Cluster liquidated state
        await this._atomicRetry(
          async () =>
            Web3Provider.isLiquidated(
              record.owner,
              record.operatorIds,
              record.cluster,
            ),
          async (result: any) => {
            if (typeof result !== 'boolean') {
              throw new Error('Failed to fetch liquidated status');
            }
            record.isLiquidated = result;
          },
          async (result: AtomicRetryFailedResult) => {
            throw new Error(
              `BurnRatesTask::syncBurnRates: Error: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );

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
              `BurnRatesTask::syncBurnRates: Error: ${JSON.stringify({
                result,
                record,
              })}`,
            );
          },
        );

        // Prepare final data
        record.cluster = JSON.stringify(record.cluster);
        record.balanceToBlockNumber =
          record.burnRate > 0
            ? currentBlockNumber +
              +(record.balance / record.burnRate).toFixed(0)
            : null;
        record.liquidationBlockNumber = record.balanceToBlockNumber
          ? record.balanceToBlockNumber - minimumBlocksBeforeLiquidation
          : null;

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
              `BurnRatesTask::syncBurnRates: Failed to update cluster db record: ${JSON.stringify(
                {
                  result,
                  record,
                },
              )}`,
            );
          },
        );
      }

      // Only after full cycle of updates set successful metrics
      this._metricsService.burnRatesStatus.set(1);
      this._metricsService.criticalStatus.set(1);
    } catch (e) {
      throw e;
    } finally {
      BurnRatesTask.isProcessLocked = false;
    }
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
        await asyncFailed({
          error,
          retry,
          maxRetries,
        });
        await new Promise(resolve =>
          setTimeout(() => resolve(true), retryDelayMs),
        );
      }
    }
  }
}
