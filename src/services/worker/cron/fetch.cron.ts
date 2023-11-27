import { Injectable } from '@nestjs/common';

import {Cron, CronExpression} from '@nestjs/schedule';
import { FetchTask } from '../tasks/fetch.task';

@Injectable()
export class FetchCron {
  constructor(private _fetchTask: FetchTask) {}

  @Cron(CronExpression.EVERY_SECOND)
  async fetchNewValidators(): Promise<void> {
    try {
      await this._fetchTask.fetchAllEvents();
    } catch (e) {
      console.log(e);
    }
  }
}
