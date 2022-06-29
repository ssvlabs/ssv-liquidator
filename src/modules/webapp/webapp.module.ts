import { Module } from '@nestjs/common';
import { ConfService } from '@cli/shared/services/conf.service';
import { MetricsController } from '@cli/modules/webapp/metrics/metrics.controller';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, ConfService],
})
export class WebappModule {}
