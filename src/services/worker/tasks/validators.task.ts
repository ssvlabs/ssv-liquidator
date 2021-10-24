import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { QueuesEnum, TasksQueuesEnum } from '../../../queues/enums/tasks.enum';
import { QueueService } from '../../../queues/queue.service';

@Processor(QueuesEnum.VALIDATORS)
export class ValidatorsTask {
  constructor() {}

  @Process(TasksQueuesEnum.FETCH_VALIDATORS.name)
  async fetch(job: Job): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching register validator events...`);
  }
}
