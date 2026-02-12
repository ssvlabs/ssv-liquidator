import { Injectable } from '@nestjs/common';

import { Cron } from '@nestjs/schedule';
import { FetchTask } from '../tasks/fetch.task';

@Injectable()
export class FetchCron {
  constructor(private _fetchTask: FetchTask) {}

  @Cron('* * * * * *')
  async fetchNewValidators(): Promise<void> {
    try {
      await this._fetchTask.fetchAllEvents();
    } catch (e) {
      console.log(e);
    }
  }
}
