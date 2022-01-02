import { Injectable } from '@nestjs/common';

import { Cron } from '@nestjs/schedule';
import { ValidatorsTask } from '../tasks/validators.task';

@Injectable()
export class ValidatorCron {
  constructor(
    private _validatorsTask: ValidatorsTask,
  ) {}

  @Cron('0 * * * * *')
  async fetchNewValidators(): Promise<void> {
    try {
      await this._validatorsTask.fetchNewValidators();
    } catch (e) {
      console.log(e);
    }
  }

  @Cron('0 * * * * *')
  async fetchUpdatedValidators(): Promise<void> {
    try {
      await this._validatorsTask.fetchUpdatedValidators();
    } catch (e) {
      console.log(e);
    }
  }
}
