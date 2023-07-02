import { Injectable } from '@nestjs/common';
import { Registry, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  static registry: Registry;
  static fetchStatus: Gauge<string>;
  static totalClusters: Gauge<string>;
  static criticalStatus: Gauge<string>;
  static burnRatesStatus: Gauge<string>;
  static liquidationStatus: Gauge<string>;
  static lastBlockNumberMetric: Gauge<string>;

  constructor() {
    MetricsService.initialize();
  }

  static initialize() {
    if (MetricsService.registry) {
      return MetricsService;
    }

    // Initialize registry for metrics
    const registry = new Registry();
    registry.setDefaultLabels({
      app: 'liquidation-cli',
    });

    // Fetch Job Status
    MetricsService.fetchStatus = new Gauge({
      name: 'fetchStatus',
      help: 'Status of fetch part of CLI',
    });
    registry.registerMetric(MetricsService.fetchStatus);
    MetricsService.fetchStatus.set(1);

    // Liquidation Job Status
    MetricsService.liquidationStatus = new Gauge({
      name: 'liquidationStatus',
      help: 'Status of liquidation part of CLI',
    });
    registry.registerMetric(MetricsService.liquidationStatus);
    MetricsService.liquidationStatus.set(1);

    // Burn Rates Job Status
    MetricsService.burnRatesStatus = new Gauge({
      name: 'burnRatesStatus',
      help: 'Status of burn rates part of CLI',
    });
    registry.registerMetric(MetricsService.burnRatesStatus);
    MetricsService.burnRatesStatus.set(1);

    // Total clusters
    MetricsService.totalClusters = new Gauge({
      name: 'totalClusters',
      help: 'Total clusters count',
    });
    registry.registerMetric(MetricsService.totalClusters);

    // Critical Status
    MetricsService.criticalStatus = new Gauge({
      name: 'criticalStatus',
      help: 'Status of any part of liquidator which requires immediate attention',
    });
    registry.registerMetric(MetricsService.criticalStatus);
    MetricsService.criticalStatus.set(1);

    // Last Block Number Metric
    MetricsService.lastBlockNumberMetric = new Gauge({
      name: 'lastBlockNumberMetric',
      help: 'Status of any part of liquidator which requires immediate attention',
    });
    registry.registerMetric(MetricsService.lastBlockNumberMetric);

    MetricsService.registry = registry;
    return MetricsService;
  }

  get registry(): Registry {
    return MetricsService.initialize().registry;
  }

  get fetchStatus(): Gauge<string> {
    return MetricsService.initialize().fetchStatus;
  }

  get liquidationStatus(): Gauge<string> {
    return MetricsService.initialize().liquidationStatus;
  }

  get burnRatesStatus(): Gauge<string> {
    return MetricsService.initialize().burnRatesStatus;
  }

  get criticalStatus(): Gauge<string> {
    return MetricsService.initialize().criticalStatus;
  }

  get lastBlockNumberMetric(): Gauge<string> {
    return MetricsService.initialize().lastBlockNumberMetric;
  }

  get totalClusters(): Gauge<string> {
    return MetricsService.initialize().totalClusters;
  }
}
