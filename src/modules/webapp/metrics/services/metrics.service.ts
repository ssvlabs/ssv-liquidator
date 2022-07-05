import prometheusClient from 'prom-client';
import { Injectable } from '@nestjs/common';

export const registry = new prometheusClient.Registry();
registry.setDefaultLabels({
  app: 'liquidation-cli',
});

/**
 * Collecting status for fetch task
 */
export const fetchStatus = new prometheusClient.Gauge({
  name: 'fetchStatus',
  help: 'Status of fetch part of CLI',
});
registry.registerMetric(fetchStatus);
fetchStatus.set(1);

/**
 * Collecting status for liquidation task
 */
export const liquidationStatus = new prometheusClient.Gauge({
  name: 'liquidationStatus',
  help: 'Status of liquidation part of CLI',
});
registry.registerMetric(liquidationStatus);
liquidationStatus.set(1);

/**
 * Collecting status for burn rate task
 */
export const burnRatesStatus = new prometheusClient.Gauge({
  name: 'burnRatesStatus',
  help: 'Status of burn rates part of CLI',
});
registry.registerMetric(burnRatesStatus);
burnRatesStatus.set(1);

/**
 * Critical status
 */
export const criticalStatus = new prometheusClient.Gauge({
  name: 'criticalStatus',
  help: 'Status of any part of liquidator which requires immediate attention',
});
registry.registerMetric(criticalStatus);
criticalStatus.set(1);

/**
 * Critical status
 */
export const lastBlockNumberMetric = new prometheusClient.Gauge({
  name: 'lastBlockNumberMetric',
  help: 'Status of any part of liquidator which requires immediate attention',
});
registry.registerMetric(lastBlockNumberMetric);

@Injectable()
export class MetricsService {
  get registry() {
    return registry;
  }

  get fetchStatus() {
    return fetchStatus;
  }

  get liquidationStatus() {
    return liquidationStatus;
  }

  get burnRatesStatus() {
    return burnRatesStatus;
  }

  get criticalStatus() {
    return criticalStatus;
  }

  get lastBlockNumberMetric() {
    return lastBlockNumberMetric;
  }
}
