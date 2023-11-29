import {Injectable, Logger} from '@nestjs/common';

import {Cron, CronExpression} from '@nestjs/schedule';
import { FetchTask } from '../tasks/fetch.task';

@Injectable()
export class FetchCron {
  private readonly _logger = new Logger(FetchCron.name);
  constructor(private _fetchTask: FetchTask) {}

  @Cron(CronExpression.EVERY_SECOND)
  async fetchNewValidators(): Promise<void> {
    try {
      await this._fetchTask.fetchAllEvents();
    } catch (e) {
      this._logger.error(e);
    }
  }
}
