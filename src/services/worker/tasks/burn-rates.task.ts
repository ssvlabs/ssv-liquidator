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
    const missedRecords = (
      await this._clusterService.findBy({
        where: { burnRate: null },
      })
    ).map(item => {
      item.cluster = JSON.parse(item.cluster);
      return item;
    });
    const burnRates = await Promise.allSettled(
      missedRecords.map(({ owner, operatorIds, cluster }) => {
        return Web3Provider.getClusterBurnRate(owner, operatorIds, cluster);
      }),
    );
    const balances = await Promise.allSettled(
      missedRecords.map(({ owner, operatorIds, cluster }) =>
        Web3Provider.getBalance(owner, operatorIds, cluster),
      ),
    );
    const liquidated = await Promise.allSettled(
      missedRecords.map(({ owner, operatorIds, cluster }) =>
        Web3Provider.isLiquidated(owner, operatorIds, cluster),
      ),
    );
    const currentBlockNumber = await Web3Provider.currentBlockNumber();
    const minimumBlocksBeforeLiquidation =
      await Web3Provider.minimumBlocksBeforeLiquidation();

    for (const [index, record] of missedRecords.entries()) {
      const burnRate = +(burnRates[index] as any).value;
      const balanceObject = balances[index] as any;
      const balance =
        balanceObject.status === 'rejected' &&
        balanceObject.reason.toString().includes('InsufficientFunds')
          ? 0
          : +balanceObject.value;
      const isLiquidated = (liquidated[index] as any).value;
      record.burnRate = burnRate;
      record.cluster = JSON.stringify(record.cluster);
      record.balanceToBlockNumber =
        burnRate > 0
          ? currentBlockNumber + +(balance / burnRate).toFixed(0)
          : null;
      record.liquidationBlockNumber = record.balanceToBlockNumber
        ? record.balanceToBlockNumber - minimumBlocksBeforeLiquidation
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
