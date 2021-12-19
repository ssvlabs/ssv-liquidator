import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';

import { ConfService } from '../shared/services/conf.service';
import { QueuesEnum } from './enums/tasks.enum';
import { QueueService } from './queue.service';
@Global()
@Module({
  imports: [
    BullModule.registerQueueAsync(
      {
        name: QueuesEnum.BURN_RATES,
        useFactory: async (configService: ConfService) => ({
          redis: configService.redisOptions,
        }),
        inject: [ConfService],
      },
      {
        name: QueuesEnum.VALIDATORS,
        useFactory: async (configService: ConfService) => ({
          redis: configService.redisOptions,
        }),
        inject: [ConfService],
      },
      {
        name: QueuesEnum.LIQUIDATION,
        useFactory: async (configService: ConfService) => ({
          redis: configService.redisOptions,
        }),
        inject: [ConfService],
      },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
