import { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';
import Web3Provider from '@cli/providers/web3.provider';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';

@Controller({
  path: 'metrics',
})
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly clusterService: ClusterService,
  ) {}

  private async collectStats() {
    const clustersActive = await this.clusterService.countActive();
    const toLiquidate = await this.clusterService.countLiquidatable();
    const liquidatorETHBalance = await Web3Provider.getETHBalance();
    this.metricsService.totalActiveClusters.set(clustersActive);
    this.metricsService.totalLiquidatableClusters.set(toLiquidate.total);
    this.metricsService.burnt50LiquidatableClusters.set(toLiquidate.burnt50);
    this.metricsService.burnt90LiquidatableClusters.set(toLiquidate.burnt90);
    this.metricsService.burnt99LiquidatableClusters.set(toLiquidate.burnt99);
    this.metricsService.liquidatorETHBalance.set(liquidatorETHBalance);
  }

  @Get()
  async metrics(@Res() res: Response) {
    await this.collectStats();
    res.header('content-type', this.metricsService.registry.contentType);
    res.send(await this.metricsService.registry.metrics());
  }
}
