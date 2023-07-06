import { Module } from '@nestjs/common';
import { MetricsController } from '@cli/modules/webapp/metrics/metrics.controller';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';
import { ClusterModule } from '@cli/modules/clusters/cluster.module';

@Module({
  imports: [ClusterModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class WebappModule {}
