import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { ValidatorModule } from '../../modules/validators/validator.module';
import { SystemModule } from '../../modules/system/system.module';
import { QueueModule } from '../../queues/queue.module';
import { ConfService } from '../../shared/services/conf.service';
// tasks list
import { SharedModule } from '../../shared/shared.module';
import TaskProviders from './tasks.provider';
import CronProviders from './cron.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfService) => ({
        uri: configService.get('MONGO_DB'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      }),
      inject: [ConfService],
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    SystemModule,
    ValidatorModule,
    QueueModule,
  ],
  providers: [ConfService, ...TaskProviders, ...CronProviders],
})
export class WorkerModule {}
