import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from '@cli/shared/shared.module';
import CronProviders from '@cli/services/worker/cron.provider';
import { ConfService } from '@cli/shared/services/conf.service';
import TaskProviders from '@cli/services/worker/tasks.provider';
import { SystemModule } from '@cli/modules/system/system.module';
import { WebappModule } from '@cli/modules/webapp/webapp.module';
import { WorkerService } from '@cli/services/worker/worker.service';
import { EarningModule } from '@cli/modules/earnings/earning.module';
import { ClusterModule } from '@cli/modules/clusters/cluster.module';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';

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
