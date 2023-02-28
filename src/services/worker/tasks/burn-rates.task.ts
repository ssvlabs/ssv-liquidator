import { Injectable } from '@nestjs/common';
import { BackOffPolicy, Retryable } from 'typescript-retry-decorator';
import Web3Provider from '@cli/providers/web3.provider';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import {
  MetricsService,
  burnRatesStatus,
  criticalStatus,
} from '@cli/modules/webapp/metrics/services/metrics.service';

@Injectable()
export class BurnRatesTask {
  constructor(
    private _clusterService: ClusterService,
    private _metricsService: MetricsService,
  ) {}

  @Retryable({
    maxAttempts: 100,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    doRetry: (e: Error) => {
      console.error(
        '[CRITICAL] Error running BurnRatesTask :: syncBurnRates: ',
        e,
      );
      burnRatesStatus.set(0);
      criticalStatus.set(0);
      return true;
    },
    exponentialOption: {
      maxInterval: 1000 * 60,
      multiplier: 2,
    },
  })
  async syncBurnRates(): Promise<void> {
    const missedRecords = await this._clusterService.findBy({
      where: { burnRate: null },
      select: ['owner'],
    });
    const burnRates = await Promise.allSettled(
      missedRecords.map(({ owner }) => Web3Provider.getClusterBurnRate(owner)),
    );
    const balances = await Promise.allSettled(
      missedRecords.map(({ owner }) => Web3Provider.getBalance(owner)),
    );
    const liquidated = await Promise.allSettled(
      missedRecords.map(({ owner }) => Web3Provider.isLiquidated(owner)),
    );
    const currentBlockNumber = await Web3Provider.currentBlockNumber();
    const minimumBlocksBeforeLiquidation =
      await Web3Provider.minimumBlocksBeforeLiquidation();

    for (const [index, record] of missedRecords.entries()) {
      const burnRate = +(burnRates[index] as any).value;
      const balanceObject = balances[index] as any;
      const balance =
        balanceObject.status === 'rejected' &&
        balanceObject.reason.toString().includes('negative balance')
          ? 0
          : +balanceObject.value;
      const isLiquidated = (liquidated[index] as any).value;
      record.burnRate = burnRate;
      record.liquidateLastBlock =
        burnRate > 0
          ? currentBlockNumber + +(balance / burnRate).toFixed(0)
          : null;
      record.liquidateFirstBlock = record.liquidateLastBlock
        ? record.liquidateLastBlock - minimumBlocksBeforeLiquidation
        : null;
      record.balance = balance;
      record.isLiquidated = isLiquidated;
    }
    await Promise.all(
      missedRecords.map(record =>
        this._clusterService.update(
          { owner: record.owner, operatorIds: record.operatorIds },
          record,
        ),
      ),
    );
    this._metricsService.burnRatesStatus.set(1);
    this._metricsService.criticalStatus.set(1);
  }
}
