import { LessThanOrEqual } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BackOffPolicy, Retryable } from 'typescript-retry-decorator';
import Web3Provider from '@cli/providers/web3.provider';
import { ConfService } from '@cli/shared/services/conf.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import {
  liquidationStatus,
  criticalStatus,
} from '@cli/modules/webapp/metrics/services/metrics.service';

@Injectable()
export class LiquidationTask {
  constructor(
    private _config: ConfService,
    private _clusterService: ClusterService,
  ) {}

  @Retryable({
    maxAttempts: 100,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    doRetry: (e: Error) => {
      console.error(
        '[CRITICAL] Error running LiquidationTask :: liquidate: ',
        e,
      );
      liquidationStatus.set(0);
      criticalStatus.set(0);
      return true;
    },
    exponentialOption: {
      maxInterval: 1000 * 60,
      multiplier: 2,
    },
  })
  async liquidate(): Promise<void> {
    const minimumBlocksBeforeLiquidation =
      +(await Web3Provider.minimumBlocksBeforeLiquidation());
    const currentBlockNumber = +(await Web3Provider.currentBlockNumber());
    const toLiquidateRecords = await this._clusterService.findBy({
      where: {
        balanceToBlockNumber: LessThanOrEqual(
          // Current block + Liquidation Threshold Period should higher
          // than the block number when balance becomes zero if not liquidated
          currentBlockNumber + minimumBlocksBeforeLiquidation,
        ),
      },
    });
    const clustersToLiquidate = [];
    for (const item of toLiquidateRecords) {
      item.cluster = JSON.parse(item.cluster);
      try {
        console.log(
          `Checking if cluster liquidatable: ${JSON.stringify(item.cluster)}`,
        );
        const liquidatable = await Web3Provider.liquidatable(
          item.owner,
          item.operatorIds,
          item.cluster,
        );
        if (liquidatable) {
          clustersToLiquidate.push(item);
        } else {
          console.log(
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
            console.log(
              `Cluster is already liquidated. Skipping: ${JSON.stringify(
                item.cluster,
              )}`,
            );
            await this._clusterService.update(
              { owner: item.owner, operatorIds: item.operatorIds },
              {
                burnRate: null,
                isLiquidated: true,
                balanceToBlockNumber: null,
                liquidationBlockNumber: null,
              },
            );
          }
        }
        liquidationStatus.set(1);
      } catch (e) {
        console.error(
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
    console.log(`trying to liquidate cluster ${owner}:[${operatorIds}]`);
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
          console.log(`🎉 The hash of liquidated transaction is: ${hash}`);
          liquidationStatus.set(1);
        } else {
          console.error(
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
        console.log(`Transaction receipt: ${JSON.stringify(data)}`);
        liquidationStatus.set(1);
        criticalStatus.set(1);
      });
  }
}
