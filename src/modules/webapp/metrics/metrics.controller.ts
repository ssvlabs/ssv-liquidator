import { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';

@Controller({
  path: 'metrics',
})
export class MetricsController {
  constructor(public readonly metricsService: MetricsService) {}

  @Get()
  async metrics(@Res() res: Response) {
    res.header('content-type', this.metricsService.registry.contentType);
    res.send(await this.metricsService.registry.metrics());
  }
}
