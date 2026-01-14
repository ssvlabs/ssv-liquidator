import { Module } from '@nestjs/common';
import { MetricsController } from '@cli-ssv/modules/webapp/metrics/metrics.controller';
import { MetricsService } from '@cli-ssv/modules/webapp/metrics/services/metrics.service';
import { ClusterModule } from '@cli-ssv/modules/clusters/cluster.module';

@Module({
  imports: [ClusterModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class WebappModule {}
