import prometheusClient from 'prom-client';
import { Injectable } from '@nestjs/common';

export const registry = new prometheusClient.Registry();
registry.setDefaultLabels({
  app: 'liquidation-cli',
});

/**
 * Collecting status for fetch task
 */
export const cliFetchStatus = new prometheusClient.Gauge({
  name: 'cli_fetch_status',
  help: 'Status of fetch part of CLI',
});
registry.registerMetric(cliFetchStatus);
cliFetchStatus.set(1);

/**
 * Collecting status for liquidation task
 */
export const cliLiquidationStatus = new prometheusClient.Gauge({
  name: 'cli_liquidation_status',
  help: 'Status of liquidation part of CLI',
});
registry.registerMetric(cliLiquidationStatus);
cliLiquidationStatus.set(1);

/**
 * Collecting status for burn rate task
 */
export const cliBurnRatesStatus = new prometheusClient.Gauge({
  name: 'cli_burn_rates_status',
  help: 'Status of burn rates part of CLI',
});
registry.registerMetric(cliBurnRatesStatus);
cliBurnRatesStatus.set(1);

@Injectable()
export class MetricsService {
  get registry() {
    return registry;
  }

  get cliFetchStatus() {
    return cliFetchStatus;
  }

  get cliLiquidationStatus() {
    return cliLiquidationStatus;
  }

  get cliBurnRatesStatus() {
    return cliBurnRatesStatus;
  }
}
