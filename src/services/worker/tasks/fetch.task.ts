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
  private _isProcessLocked: boolean;

  constructor(
    private _systemService: SystemService,
    private _workerService: WorkerService,
    private readonly _metricsService: MetricsService,
  ) {
    this._isProcessLocked = false;
  }

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
    if (this._isProcessLocked) return;

    try {
      this._isProcessLocked = true;
      this._syncUpdates();
      // Metrics
      this._metricsService.fetchStatus.set(1);
      this._metricsService.criticalStatus.set(1);
    } catch (e) {
      console.error(e);
    }

    this._isProcessLocked = false;
  }

  private async _syncUpdates(): Promise<void> {
    const DAY = 5_400;
    const WEEK = DAY * 7;
    const MONTH = DAY * 30;

    let latestBlockNumber;
    try {
      latestBlockNumber = await Web3Provider.web3.eth.getBlockNumber();
    } catch (err) {
      throw new Error('Could not access the provided node endpoint.');
    }
    try {
      await Web3Provider.minimumBlocksBeforeLiquidation();
      // HERE we can validate the contract owner address
    } catch (err) {
      throw new Error('The provided contract address is not valid.');
    }
    let step = MONTH;

    const filters = {
      fromBlock: 7938000,
      toBlock: 7938000 + step,
    };

    while (filters.fromBlock < latestBlockNumber) {
      console.log(`Syncing events in blocks range: ${JSON.stringify(filters)}`);
      try {
        const events = await Web3Provider.contractCore.getPastEvents(
          'allEvents',
          filters,
        );
        await this._workerService.processEvents(events);

        await this._systemService.save(
          SystemType.GENERAL_LAST_BLOCK_NUMBER,
          filters.toBlock,
        );

        this._metricsService.lastBlockNumberMetric.set(filters.toBlock);

        console.log(`Processed ${events.length} events`);

        filters.fromBlock = filters.toBlock;
      } catch (e) {
        console.error(e);
        if (step === MONTH) {
          step = WEEK;
        } else if (step === WEEK) {
          step = DAY;
        } else if (step === DAY) {
          throw new Error(e);
        }
      }
      filters.toBlock = filters.fromBlock + step;
    }
  }
}
