import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { QueuesEnum, TasksQueuesEnum } from '../../../queues/enums/tasks.enum';
import { QueueService } from '../../../queues/queue.service';

@Processor(QueuesEnum.BURN_RATES)
export class BurnRatesTask {
  constructor() {}

  @Process(TasksQueuesEnum.SYNC_BURN_RATES.name)
  async sync(job: Job): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`syncing burn rate updates events...`);
  }
}
