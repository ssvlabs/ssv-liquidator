import { Injectable } from '@nestjs/common';

import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { CustomLogger } from '@cli/shared/services/logger.service';
import { Web3Provider } from '@cli/shared/services/web3.provider';

@Injectable()
export class VerifyThresholdTask {
  private readonly _logger = new CustomLogger(VerifyThresholdTask.name);

  constructor(
    private _clusterService: ClusterService,
    private _web3Provider: Web3Provider,
  ) {}

  async verify(): Promise<void> {
    const currentBlock = await this._web3Provider.currentBlockNumber();
    const clusters = await this._clusterService.findBy({
      where: { isLiquidated: false },
    });

    this._logger.log(
      `Threshold verification started: currentBlock=${currentBlock} clusters=${clusters.length}`,
    );

    let checked = 0;
    let skipped = 0;
    let p0Count = 0;

    for (const cluster of clusters) {
      let clusterSnapshot: any;
      try {
        clusterSnapshot =
          typeof cluster.cluster === 'string'
            ? JSON.parse(cluster.cluster)
            : cluster.cluster;
      } catch {
        skipped++;
        continue;
      }

      let onChainLiquidatable: boolean;
      try {
        onChainLiquidatable = await this._web3Provider.liquidatable(
          cluster.owner,
          cluster.operatorIds,
          clusterSnapshot,
        );
      } catch {
        skipped++;
        continue;
      }

      const localLiquidatable =
        cluster.liquidationBlockNumber !== null &&
        cluster.burnRate !== null &&
        cluster.burnRate !== 0 &&
        currentBlock >= cluster.liquidationBlockNumber;

      if (onChainLiquidatable && !localLiquidatable) {
        p0Count++;
        this._logger.error(
          `[P0] Missed liquidation: ${JSON.stringify({
            owner: cluster.owner,
            operatorIds: cluster.operatorIds,
            localBalance: cluster.balance,
            localLiquidatable,
            onChainLiquidatable,
          })}`,
        );
      }

      checked++;
    }

    this._logger.log(
      `Threshold verification complete: checked=${checked} skipped=${skipped} p0=${p0Count}`,
    );
  }
}
