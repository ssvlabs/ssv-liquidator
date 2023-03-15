import { Injectable } from '@nestjs/common';
import { Retryable, BackOffPolicy } from 'typescript-retry-decorator';
import Web3Provider from '@cli/providers/web3.provider';
import { WorkerService } from '@cli/services/worker/worker.service';
import { SystemService, SystemType } from '@cli/modules/system/system.service';
import {
  MetricsService,
  fetchStatus,
  criticalStatus,
} from '@cli/modules/webapp/metrics/services/metrics.service';

@Injectable()
export class FetchTask {
  private static isProcessLocked = false;

  constructor(
    private _systemService: SystemService,
    private _workerService: WorkerService,
    private readonly _metricsService: MetricsService,
  ) {}

  /*
    This task used to collect all contract events for specific period of time/blocks
  */
  @Retryable({
    maxAttempts: 100,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    doRetry: (e: Error) => {
      console.error(
        '[CRITICAL] Error running FetchTask :: fetchAllEvents: ',
        e,
      );
      fetchStatus.set(0);
      criticalStatus.set(0);
      return true;
    },
    exponentialOption: {
      maxInterval: 1000 * 60,
      multiplier: 2,
    },
  })
  async fetchAllEvents(): Promise<void> {
    if (FetchTask.isProcessLocked) {
      console.debug(`FetchTask process is already locked.`);
    }

    try {
      FetchTask.isProcessLocked = true;

      try {
        await Web3Provider.minimumBlocksBeforeLiquidation();
        // HERE we can validate the contract owner address
      } catch (err) {
        throw new Error(
          `'The provided contract address is not valid. Error: ${err}`,
        );
      }

      let latestBlockNumber;
      try {
        latestBlockNumber = await Web3Provider.web3.eth.getBlockNumber();
      } catch (err) {
        throw new Error('Could not access the provided node endpoint.');
      }

      const fromBlock =
        (await this._systemService.get(SystemType.GENERAL_LAST_BLOCK_NUMBER)) ||
        0;

      console.log(
        `Syncing events in a blocks range #${fromBlock}_${latestBlockNumber}`,
      );
      await this._syncUpdates(fromBlock, latestBlockNumber);
      console.log(
        `Synced completed for a blocks range #${fromBlock}_${latestBlockNumber}`,
      );

      // Metrics
      this._metricsService.fetchStatus.set(1);
      this._metricsService.criticalStatus.set(1);
    } catch (e) {
      console.error(`FetchTask::fetchAllEvents: Error: ${e}`);
    } finally {
      FetchTask.isProcessLocked = false;
    }
  }

  private async _syncUpdates(
    fromBlock: number,
    latestBlockNumber: number,
  ): Promise<void> {
    // TODO: move these constants out from the method
    const DAY = 5_400;
    const WEEK = DAY * 7;
    const MONTH = DAY * 30;
    let step = MONTH;
    const filters = {
      fromBlock,
      toBlock:
        fromBlock + step > latestBlockNumber
          ? latestBlockNumber
          : fromBlock + step,
    };

    while (filters.fromBlock < latestBlockNumber) {
      try {
        const events = await Web3Provider.contractCore.getPastEvents(
          'allEvents',
          filters,
        );

        events.length &&
          console.log(`Going to process ${events.length} events`);

        // parse new events
        await this._workerService.processEvents(events);

        await this._systemService.save(
          SystemType.GENERAL_LAST_BLOCK_NUMBER,
          filters.toBlock,
        );

        // Change block range for next fetch
        this._metricsService.lastBlockNumberMetric.set(filters.toBlock);
        filters.fromBlock = filters.toBlock;
        filters.toBlock =
          filters.fromBlock + step > latestBlockNumber
            ? latestBlockNumber
            : filters.fromBlock + step;
      } catch (e) {
        console.error(`FetchTask::_syncUpdates: Error: ${e}`);
        // try to make the blocks range smaller if it fails for big amount of data
        if (step === MONTH) {
          step = WEEK;
        } else if (step === WEEK) {
          step = DAY;
        } else if (step === DAY) {
          console.error(
            `FetchTask::_syncUpdates: already using 1 day period for syncing and still getting error!`,
          );
        }
      }
    }
  }
}
