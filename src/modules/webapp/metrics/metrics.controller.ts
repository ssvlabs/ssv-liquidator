import { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { Web3Provider } from '@cli/shared/services/web3.provider';

@Controller({
  path: 'metrics',
})
export class MetricsController {
  constructor(
    private _metricsService: MetricsService,
    private _clusterService: ClusterService,
    private _web3Provider: Web3Provider,
  ) {}

  private async collectStats() {
    const clustersActive = await this._clusterService.countActive();
    const toLiquidate = await this._clusterService.countLiquidatable();
    const liquidatorETHBalance = await this._web3Provider.getLiquidatorETHBalance();
    this._metricsService.totalActiveClusters.set(clustersActive);
    this._metricsService.totalLiquidatableClusters.set(toLiquidate.total);
    this._metricsService.burnt10LiquidatableClusters.set(toLiquidate.burnt10);
    this._metricsService.burnt50LiquidatableClusters.set(toLiquidate.burnt50);
    this._metricsService.burnt90LiquidatableClusters.set(toLiquidate.burnt90);
    this._metricsService.burnt99LiquidatableClusters.set(toLiquidate.burnt99);
    this._metricsService.liquidatorETHBalance.set(liquidatorETHBalance);
  }

  @Get()
  async metrics(@Res() res: Response) {
    await this.collectStats();
    res.header('content-type', this._metricsService.registry.contentType);
    res.send(await this._metricsService.registry.metrics());
  }
}
