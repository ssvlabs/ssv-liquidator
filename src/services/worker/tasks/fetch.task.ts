import Web3Provider from '@cli/providers/web3.provider';

import { Injectable } from '@nestjs/common';

import { SystemService, SystemType } from '@cli/modules/system/system.service';
import { WorkerService } from '@cli/services/worker/worker.service';

@Injectable()
export class FetchTask {
  constructor(
    private _systemService: SystemService,
    private _workerService: WorkerService,
  ) {}

  async fetchAllEvents(): Promise<void> {
    try {
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
    } catch (e) {
      console.error(e);
    }
  }
}
