import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AddressModule } from '@cli/modules/addresses/address.module';
import { ConfService } from '@cli/shared/services/conf.service';
import { EarningModule } from '@cli/modules/earnings/earning.module';
import { SystemModule } from '@cli/modules/system/system.module';
import { SharedModule } from '@cli/shared/shared.module';

// tasks list
import TaskProviders from './tasks.provider';
import CronProviders from './cron.provider';

import { WorkerService } from './worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: __dirname + '/../../../data/local.db',
      synchronize: true,
      logging: false,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    SharedModule,
    SystemModule,
    AddressModule,
    EarningModule,
  ],
  providers: [ConfService, ...TaskProviders, ...CronProviders, WorkerService],
})
export class WorkerModule {}
