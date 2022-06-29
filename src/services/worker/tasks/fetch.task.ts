import { Injectable } from '@nestjs/common';
import { Retryable, BackOffPolicy } from 'typescript-retry-decorator';
import Web3Provider from '@cli/providers/web3.provider';
import { WorkerService } from '@cli/services/worker/worker.service';
import { SystemService, SystemType } from '@cli/modules/system/system.service';

@Injectable()
export class FetchTask {
  constructor(
    private _systemService: SystemService,
    private _workerService: WorkerService,
  ) {}

  @Retryable({
    maxAttempts: 100,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    doRetry: (e: Error) => {
      console.log('Error running FetchTask::fetchAllEvents: ', e);
      return true;
    },
    exponentialOption: {
      maxInterval: 1000 * 60,
      multiplier: 2,
    },
  })
  async fetchAllEvents(): Promise<void> {
    const latestBlock = await Web3Provider.web3.eth.getBlockNumber();
    let fromBlock =
      (await this._systemService.get(SystemType.GENERAL_LAST_BLOCK_NUMBER)) ||
      0;

    fromBlock = fromBlock ? fromBlock + 1 : 0;

    let toBlock = (fromBlock || 0) + Web3Provider.BLOCK_RANGE_500K;
    if (toBlock > latestBlock) {
      toBlock = latestBlock;
    }

    const filters = {
      fromBlock,
      toBlock,
    };

    console.log(`fetching all events...`, filters);
    const events = await Web3Provider.contract.getPastEvents(
      'allEvents',
      filters,
    );

    await this._workerService.processEvents(events);

    await this._systemService.save(
      SystemType.GENERAL_LAST_BLOCK_NUMBER,
      filters.toBlock,
    );

    console.log(`passed ${events.length} all events...`);
  }
}
