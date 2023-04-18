import { LessThanOrEqual } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import Web3Provider from '@cli/providers/web3.provider';
import { ConfService } from '@cli/shared/services/conf.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import {
  liquidationStatus,
  criticalStatus,
} from '@cli/modules/webapp/metrics/services/metrics.service';

@Injectable()
export class LiquidationTask {
  private readonly _logger = new Logger(LiquidationTask.name);
  constructor(
    private _config: ConfService,
    private _clusterService: ClusterService,
  ) {}

  async liquidate(): Promise<void> {
    const currentBlockNumber = +(await Web3Provider.currentBlockNumber());
    const toLiquidateRecords = await this._clusterService.findBy({
      where: {
        liquidationBlockNumber: LessThanOrEqual(
          // Current block
          // than the block number when balance becomes zero if not liquidated
          currentBlockNumber,
        ),
      },
    });
    const clustersToLiquidate = [];
    for (const item of toLiquidateRecords) {
      item.cluster = JSON.parse(item.cluster);
      try {
        this._logger.log(
          `Checking if cluster can be liquidated: ${JSON.stringify(
            item.cluster,
          )}`,
        );
        const liquidatable = await Web3Provider.liquidatable(
          item.owner,
          item.operatorIds,
          item.cluster,
        );
        if (liquidatable) {
          clustersToLiquidate.push(item);
        } else {
          this._logger.log(
            `Checking if cluster already liquidated: ${JSON.stringify(
              item.cluster,
            )}`,
          );
          const isLiquidated = await Web3Provider.isLiquidated(
            item.owner,
            item.operatorIds,
            item.cluster,
          );
          if (isLiquidated) {
            const updated = await this._clusterService.update(
              { owner: item.owner, operatorIds: item.operatorIds },
              {
                balance: null,
                burnRate: null,
                isLiquidated: true,
                liquidationBlockNumber: null,
              },
            );
            if (updated) {
              this._logger.log(
                `Updated liquidated cluster: ${JSON.stringify(item.cluster)}`,
              );
            }
          }
        }
        liquidationStatus.set(1);
      } catch (e) {
        this._logger.error(
          `Cluster ${item.owner}: [${item.operatorIds}] not possible to liquidate. Error: ${e}`,
        );
        liquidationStatus.set(0);
      }
    }
    if (clustersToLiquidate.length === 0) {
      // nothing to liquidate
      liquidationStatus.set(1);
      criticalStatus.set(1);
      return;
    }

    for (const item of clustersToLiquidate) {
      await this.doLiquidation(item.owner, item.operatorIds, item.cluster);
    }
  }

  private async doLiquidation(owner, operatorIds, cluster) {
    this._logger.log(`trying to liquidate cluster ${owner}:[${operatorIds}]`);
    const data = (
      await Web3Provider.contractCore.methods.liquidate(
        owner,
        Web3Provider.operatorIdsToArray(operatorIds),
        cluster,
      )
    ).encodeABI();

    const transaction: any = {
      to: this._config.get('SSV_NETWORK_ADDRESS'),
      value: 0,
      nonce: await Web3Provider.web3.eth.getTransactionCount(
        Web3Provider.web3.eth.accounts.privateKeyToAccount(
          this._config.get('ACCOUNT_PRIVATE_KEY'),
        ).address,
        'pending',
      ),
      data,
    };

    const gas =
      (await Web3Provider.web3.eth.estimateGas({
        ...transaction,
        from: Web3Provider.web3.eth.accounts.privateKeyToAccount(
          this._config.get('ACCOUNT_PRIVATE_KEY'),
        ).address,
      })) * 1.2;

    transaction.gas = +gas.toFixed(0);

    let gasPrice = +(await Web3Provider.web3.eth.getGasPrice());
    if (this._config.get('GAS_PRICE') === 'low') {
      gasPrice -= gasPrice * 0.1;
    } else if (this._config.get('GAS_PRICE') === 'medium') {
      gasPrice += gasPrice * 0.2;
    } else if (this._config.get('GAS_PRICE') === 'high') {
      gasPrice += gasPrice * 0.4;
    }

    transaction.gasPrice = +gasPrice.toFixed(0);

    const signedTx = await Web3Provider.web3.eth.accounts.signTransaction(
      transaction,
      this._config.get('ACCOUNT_PRIVATE_KEY'),
    );

    Web3Provider.web3.eth
      .sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
        if (!error) {
          this._logger.log(`🎉 The hash of liquidated transaction is: ${hash}`);
          liquidationStatus.set(1);
        } else {
          this._logger.error(
            `[CRITICAL] Something went wrong while submitting your transaction: ${
              error.message || error
            }`,
          );
          liquidationStatus.set(0);
          criticalStatus.set(0);
        }
      })
      .on('receipt', data => {
        // gasPrice * data.gasUsed
        this._logger.log(`Transaction receipt: ${JSON.stringify(data)}`);
        liquidationStatus.set(1);
        criticalStatus.set(1);
      });
  }
}
