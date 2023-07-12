import { Injectable } from '@nestjs/common';
import { Registry, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  static registry: Registry;
  static fetchStatus: Gauge<string>;
  static totalActiveClusters: Gauge<string>;
  static totalLiquidatableClusters: Gauge<string>;
  static burnt10LiquidatableClusters: Gauge<string>;
  static burnt50LiquidatableClusters: Gauge<string>;
  static burnt90LiquidatableClusters: Gauge<string>;
  static burnt99LiquidatableClusters: Gauge<string>;
  static criticalStatus: Gauge<string>;
  static burnRatesStatus: Gauge<string>;
  static liquidationStatus: Gauge<string>;
  static lastBlockNumberMetric: Gauge<string>;
  static liquidatorETHBalance: Gauge<string>;

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
      help: 'The number of failed transactions for a time period',
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

    // Total active clusters
    MetricsService.totalActiveClusters = new Gauge({
      name: 'totalActiveClusters',
      help: 'Total active clusters count',
    });
    registry.registerMetric(MetricsService.totalActiveClusters);

    // Total liquidatable clusters
    MetricsService.totalLiquidatableClusters = new Gauge({
      name: 'totalLiquidatableClusters',
      help: 'Total liquidatable clusters count',
    });
    registry.registerMetric(MetricsService.totalLiquidatableClusters);

    // Clusters gone through 10% of their liquidation collateral
    MetricsService.burnt10LiquidatableClusters = new Gauge({
      name: 'burnt10LiquidatableClusters',
      help: 'Clusters gone through 10% of their liquidation collateral counter',
    });
    registry.registerMetric(MetricsService.burnt10LiquidatableClusters);

    // Clusters gone through 50% of their liquidation collateral
    MetricsService.burnt50LiquidatableClusters = new Gauge({
      name: 'burnt50LiquidatableClusters',
      help: 'Clusters gone through 50% of their liquidation collateral counter',
    });
    registry.registerMetric(MetricsService.burnt50LiquidatableClusters);

    // Clusters gone through 90% of their liquidation collateral
    MetricsService.burnt90LiquidatableClusters = new Gauge({
      name: 'burnt90LiquidatableClusters',
      help: 'Clusters gone through 90% of their liquidation collateral counter',
    });
    registry.registerMetric(MetricsService.burnt90LiquidatableClusters);

    // Clusters gone through 99% of their liquidation collateral
    MetricsService.burnt99LiquidatableClusters = new Gauge({
      name: 'burnt99LiquidatableClusters',
      help: 'Clusters gone through 99% of their liquidation collateral counter',
    });
    registry.registerMetric(MetricsService.burnt99LiquidatableClusters);

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
      help: 'The last synced block number',
    });
    registry.registerMetric(MetricsService.lastBlockNumberMetric);

    // Last Block Number Metric
    MetricsService.liquidatorETHBalance = new Gauge({
      name: 'liquidatorETHBalance',
      help: 'Current balance of the wallet of the liquidator',
    });
    registry.registerMetric(MetricsService.liquidatorETHBalance);

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

  get totalActiveClusters(): Gauge<string> {
    return MetricsService.initialize().totalActiveClusters;
  }

  get totalLiquidatableClusters(): Gauge<string> {
    return MetricsService.initialize().totalLiquidatableClusters;
  }

  get burnt10LiquidatableClusters(): Gauge<string> {
    return MetricsService.initialize().burnt10LiquidatableClusters;
  }

  get burnt50LiquidatableClusters(): Gauge<string> {
    return MetricsService.initialize().burnt50LiquidatableClusters;
  }

  get burnt90LiquidatableClusters(): Gauge<string> {
    return MetricsService.initialize().burnt90LiquidatableClusters;
  }

  get burnt99LiquidatableClusters(): Gauge<string> {
    return MetricsService.initialize().burnt99LiquidatableClusters;
  }

  get liquidatorETHBalance(): Gauge<string> {
    return MetricsService.initialize().liquidatorETHBalance;
  }
}
