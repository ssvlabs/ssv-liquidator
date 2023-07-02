import { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';

@Controller({
  path: 'metrics',
})
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService, // private readonly clusterService: ClusterService,
  ) {}

  private async collectStats() {
    // const clusters = await this.clusterService.findAll();
    this.metricsService.totalClusters.set(123);
  }

  @Get()
  async metrics(@Res() res: Response) {
    await this.collectStats();
    res.header('content-type', this.metricsService.registry.contentType);
    res.send(await this.metricsService.registry.metrics());
  }
}
