import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from '@cli-ssv/shared/shared.module';
import CronProviders from '@cli-ssv/services/worker/cron.provider';
import { ConfService } from '@cli-ssv/shared/services/conf.service';
import TaskProviders from '@cli-ssv/services/worker/tasks.provider';
import { SystemModule } from '@cli-ssv/modules/system/system.module';
import { WebappModule } from '@cli-ssv/modules/webapp/webapp.module';
import { WorkerService } from '@cli-ssv/services/worker/worker.service';
import { EarningModule } from '@cli-ssv/modules/earnings/earning.module';
import { ClusterModule } from '@cli-ssv/modules/clusters/cluster.module';
import { MetricsService } from '@cli-ssv/modules/webapp/metrics/services/metrics.service';

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
    ClusterModule,
    EarningModule,
    WebappModule,
  ],
  providers: [
    ConfService,
    ...TaskProviders,
    ...CronProviders,
    WorkerService,
    MetricsService,
  ],
})
export class WorkerModule {}
