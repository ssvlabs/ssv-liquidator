import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AddressModule } from '../../modules/addresses/address.module';
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
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'local.db',
      synchronize: true,
      logging: false,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    SystemModule,
    AddressModule,
    QueueModule,
  ],
  providers: [ConfService, ...TaskProviders, ...CronProviders],
})
export class WorkerModule {}
