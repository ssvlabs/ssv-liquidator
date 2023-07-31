import { Injectable, Logger } from '@nestjs/common';
import Web3Provider from '@cli/providers/web3.provider';
import { WorkerService } from '@cli/services/worker/worker.service';
import { SystemService, SystemType } from '@cli/modules/system/system.service';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';

@Injectable()
export class FetchTask {
  private static isProcessLocked = false;
  private readonly _logger = new Logger(FetchTask.name);

  constructor(
    private _systemService: SystemService,
    private _workerService: WorkerService,
    private readonly _metricsService: MetricsService,
  ) {}

  static get BLOCK_RANGE() {
    return 500;
  }

  /*
    This task used to collect all contract events for specific period of time/blocks
  */
  async fetchAllEvents(): Promise<void> {
    if (FetchTask.isProcessLocked) {
      this._logger.debug(`Fetching new events is already locked`);
      return;
    }

    let latestBlockNumber;
    try {
      latestBlockNumber = await Web3Provider.web3.eth.getBlockNumber();
    } catch (err) {
      throw new Error('Could not access the provided node endpoint');
    }

    try {
      await Web3Provider.getLiquidationThresholdPeriod();
      // HERE we can validate the contract owner address
    } catch (err) {
      throw new Error(
        `'The provided contract address is not valid. Error: ${err}`,
      );
    }

    try {
      FetchTask.isProcessLocked = true;

      while (true) {
        const fromBlock =
          (await this._systemService.get(
            SystemType.GENERAL_LAST_BLOCK_NUMBER,
          )) || Web3Provider.getGenesisBlock();

        const toBlock = Math.min(
          fromBlock + FetchTask.BLOCK_RANGE,
          latestBlockNumber,
        );

        this._logger.log(
          `Syncing events in a blocks range: ${fromBlock} - ${toBlock}`,
        );

        await this._syncUpdates(fromBlock, toBlock);

        this._logger.log(
          `Sync completed for a blocks range: ${fromBlock} - ${toBlock}`,
        );

        // Metrics
        this._metricsService.fetchStatus.set(1);

        const messageDetails = `From block: ${fromBlock}, to block: ${toBlock}, latest block: ${latestBlockNumber}`;
        if (toBlock < latestBlockNumber) {
          this._logger.log(
            `Continuing fetching immediately because latest block number is not reached. ${messageDetails}`,
          );
        } else {
          this._logger.log(
            `Fetched all events till latest block. ${messageDetails}`,
          );
          break;
        }
      }
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
          this._logger.log(`Going to process ${events.length} events`);

        // parse new events
        await this._workerService.processEvents(events);

        await this._systemService.save(
          SystemType.GENERAL_LAST_BLOCK_NUMBER,
          filters.toBlock,
        );

        // Change block range for next fetch
        this._metricsService.lastBlockNumberMetric.set(filters.toBlock);

        // Move fromBlock pointer forward only in case if flow was successful!
        // Otherwise, if error happened and fromBlock will be moved forward,
        // the sync for failed ranges won't happen
        filters.fromBlock = filters.toBlock;
      } catch (e) {
        this._logger.error(`Sync updates error: ${e}`);
        // try to make the blocks range smaller if it fails for big amount of data
        if (step === MONTH) {
          step = WEEK;
        } else if (step === WEEK) {
          step = DAY;
        } else if (step === DAY) {
          throw new Error(
            `FetchTask::_syncUpdates: already using 1 day period for syncing and still getting error: ${e}`,
          );
        }
      } finally {
        // Re-assign toBlock in any case with old/new fromBlock after step possible changes
        filters.toBlock =
          filters.fromBlock + step > latestBlockNumber
            ? latestBlockNumber
            : filters.fromBlock + step;
      }
    }
  }
}
