import { Injectable } from '@nestjs/common';
import Web3Provider from '@cli/providers/web3.provider';
import SolidityErrors from '@cli/providers/solidity-errors.provider';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';
import { ConfService } from '@cli/shared/services/conf.service';
import { IsNull } from 'typeorm';

@Injectable()
export class BurnRatesTask {
  private _ITEMS_TO_PROCEED = 10;
  private static isProcessLocked = false;

  constructor(
    private _clusterService: ClusterService,
    private _metricsService: MetricsService,
    private _config: ConfService,
  ) {}

  /**
   * If cluster has been updated in worker service it gets the fresh metrics
   * and generate updated cluster profile
   */
  async syncBurnRates(): Promise<void> {
    if (BurnRatesTask.isProcessLocked) {
      console.debug(`BurnRatesTask process is already locked.`);
      return;
    }
    BurnRatesTask.isProcessLocked = true;
    try {
      this._metricsService.burnRatesStatus.set(0);
      this._metricsService.criticalStatus.set(0);
      await this._proceed();
      // Only after full cycle of updates set successful metrics
      this._metricsService.burnRatesStatus.set(1);
      this._metricsService.criticalStatus.set(1);
    } catch (e) {
      console.log('ERROR: syncBurnRates', e);
    }
    BurnRatesTask.isProcessLocked = false;
  }

  private async _proceed(): Promise<void> {
    const missedRecords = (
      await this._clusterService.findBy({
        where: { burnRate: IsNull() },
        take: this._ITEMS_TO_PROCEED,
      })
    ).map(item => {
      try {
        item.cluster = JSON.parse(item.cluster);
      } catch (e) {
        console.error(`Can not json parse cluster data from DB! Skipping.`);
      }
      return item;
    });

    if (missedRecords.length === 0) {
      return;
    }

    const burnRates = await Web3Provider.proceedWithConcurrencyLimit(
      missedRecords.map(record =>
        Web3Provider.getWithRetry(Web3Provider.getBurnRate, [
          record.owner,
          record.operatorIds,
          record.cluster,
        ]),
      ),
      this._config.rateLimit(),
    );

    const balances = await Web3Provider.proceedWithConcurrencyLimit(
      missedRecords.map(record =>
        Web3Provider.getWithRetry(Web3Provider.getBalance, [
          record.owner,
          record.operatorIds,
          record.cluster,
        ]),
      ),
      this._config.rateLimit(),
    );

    const liquidated = await Web3Provider.proceedWithConcurrencyLimit(
      missedRecords.map(record =>
        Web3Provider.getWithRetry(Web3Provider.isLiquidated, [
          record.owner,
          record.operatorIds,
          record.cluster,
        ]),
      ),
      this._config.rateLimit(),
    );

    const aggrs = missedRecords.map((item, index) => ({
      burnRate: burnRates[index] as any,
      balance: balances[index] as any,
      isLiquidated: liquidated[index] as any,
    }));

    // get SSV Network params
    const minimumBlocksBeforeLiquidation =
      await Web3Provider.minimumBlocksBeforeLiquidation();
    const currentBlockNumber = await Web3Provider.currentBlockNumber();
    // Get minimum collateral amount (in SSV)
    const collateralAmount =
      +(await Web3Provider.getMinimumLiquidationCollateral());

    for (const [index, record] of missedRecords.entries()) {
      // Prepare final data
      record.cluster = JSON.stringify(record.cluster);
      const clusterError =
        aggrs[index].burnRate.error || aggrs[index].balance.error;
      if (
        (clusterError &&
          SolidityErrors.isError(clusterError, 'ClusterIsLiquidated')) ||
        aggrs[index].isLiquidated.value
      ) {
        await this._clusterService.update(
          {
            owner: record.owner,
            operatorIds: record.operatorIds,
          },
          {
            balance: null,
            burnRate: null,
            isLiquidated: true,
            liquidationBlockNumber: null,
          },
        );
        continue;
      }

      const burnRate = aggrs[index].burnRate.value;
      const balance = aggrs[index].balance.value;
      const isLiquidated = aggrs[index].isLiquidated.value;
      // If cluster won't be liquidated, at which block number his balance becomes zero
      // check if burnRate and balance are valid, > 0
      if (!Number.isNaN(burnRate) && !Number.isNaN(balance) && burnRate > 0) {
        this._calc(record, {
          burnRate,
          balance,
          isLiquidated,
          minimumBlocksBeforeLiquidation,
          currentBlockNumber,
          collateralAmount,
        });
      } else {
        record.burnRate = null;
        record.balance = null;
        record.liquidationBlockNumber = null;
      }
      await this._clusterService.update(
        { owner: record.owner, operatorIds: record.operatorIds },
        record,
      );
    }
  }

  private _calc(
    record,
    {
      balance,
      burnRate,
      isLiquidated,
      minimumBlocksBeforeLiquidation,
      currentBlockNumber,
      collateralAmount,
    },
  ): void {
    record.balance = balance;
    record.burnRate = burnRate;
    record.isLiquidated = isLiquidated;
    // Calculate in which block the cluster will start to be ready for liquidation
    const liveUntilBlockByBalance =
      currentBlockNumber +
      record.balance / record.burnRate -
      minimumBlocksBeforeLiquidation;

    // Calculate balance at the block when the cluster will start to be ready for liquidation
    const latestLiveBlockBalance =
      record.balance -
      (liveUntilBlockByBalance - currentBlockNumber) * record.burnRate;

    if (record.balance <= collateralAmount) {
      // If balance less than minimum collateral amount set a flag to liquidate asap
      record.liquidationBlockNumber = currentBlockNumber;
    } else if (latestLiveBlockBalance < collateralAmount) {
      // If balance at the block when the cluster will start to be ready for liquidation
      // less than minimum collateral amount, set the block when need to liquidate that to get at least minimum collateral amount
      record.liquidationBlockNumber =
        currentBlockNumber +
        (record.balance - collateralAmount) / record.burnRate;
    } else {
      // If balance at the block when the cluster will start to be ready for liquidation
      // more or equal than minimum collateral amount, set the block when need to liquidate by actual balance
      record.liquidationBlockNumber = liveUntilBlockByBalance;
    }
  }
}
