import { LessThanOrEqual } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import Web3Provider from '@cli/providers/web3.provider';
import { Cluster } from '@cli/modules/clusters/cluster.entity';
import { ConfService } from '@cli/shared/services/conf.service';
import { RetryService } from '@cli/shared/services/retry.service';
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
    private _retryService: RetryService,
  ) {}

  async liquidate(): Promise<void> {
    const currentBlockNumber = +(await this._retryService.getWithRetry(
      Web3Provider.currentBlockNumber,
    ));
    const toLiquidateRecords = await this._clusterService.findBy({
      where: {
        liquidationBlockNumber: LessThanOrEqual(
          // Current block
          // than the block number when balance becomes zero if not liquidated
          currentBlockNumber,
        ),
      },
    });
    const clustersToLiquidate: Cluster[] = [];
    const alreadyLiquidatedClusterUpdates = {
      balance: null,
      burnRate: null,
      isLiquidated: true,
      liquidationBlockNumber: null,
    };
    for (const item of toLiquidateRecords) {
      item.cluster = JSON.parse(item.cluster);
      const logItem = JSON.stringify(item);
      try {
        this._logger.log(
          `Checking in a contract that cluster is liquidatable: ${logItem}`,
        );
        const canLiquidateCluster = await this._retryService.getWithRetry(
          Web3Provider.liquidatable,
          [item.owner, item.operatorIds, item.cluster],
        );
        if (canLiquidateCluster) {
          this._logger.log(`YES. Cluster is liquidatable: ${logItem}`);
          clustersToLiquidate.push(item);
        } else {
          this._logger.log(
            `Checking in a contract if cluster has already been liquidated: ${logItem}`,
          );
          const isLiquidated = await this._retryService.getWithRetry(
            Web3Provider.isLiquidated,
            [item.owner, item.operatorIds, item.cluster],
          );
          this._logger.log(
            `${isLiquidated ? 'YES' : 'NO'}. Cluster has ${
              isLiquidated ? '' : 'NOT'
            } been liquidated: ${logItem}`,
          );
          if (isLiquidated) {
            const updated = await this._clusterService.update(
              { owner: item.owner, operatorIds: item.operatorIds },
              alreadyLiquidatedClusterUpdates,
            );
            if (updated) {
              this._logger.log(
                `Updated liquidated cluster: ${JSON.stringify({
                  ...item,
                  ...alreadyLiquidatedClusterUpdates,
                })}`,
              );
            }
          }
        }
        liquidationStatus.set(1);
      } catch (error) {
        this._logger.error(
          `Error occurred during cluster liquidation preparations: ${JSON.stringify(
            {
              ...item,
              ...alreadyLiquidatedClusterUpdates,
            },
          )}`,
          error,
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

    // When few liquidators of the same user works in parallel,
    // it is better to try to liquidate feq clusters at the same time.
    // Also, when different users try to liquidate the same list of clusters,
    // it is better to try to liquidate some other cluster than others trying
    // to liquidate at the same moment.
    // To achieve this, - it is better to randomly sort final liquidation list.
    clustersToLiquidate.sort(() => Math.random() - 0.5);
    for (const item of clustersToLiquidate) {
      await this.liquidateCluster(item);
    }
  }

  /**
   * Receives Cluster db record and sends liquidation request
   * @param item
   * @private
   */
  private async liquidateCluster(item: any): Promise<boolean> {
    const { owner, operatorIds, cluster } = item;
    const logItem = JSON.stringify(item);

    this._logger.log(`Attempt to liquidate a cluster: ${logItem}`);

    this._logger.debug(
      `Building transaction to liquidate a cluster: ${logItem}`,
    );
    const transaction: Record<string, any> = await this.buildTransaction({
      owner,
      operatorIds,
      cluster,
    });
    this._logger.debug(
      `Built transaction to liquidate a cluster: ${logItem}. Transaction: ${JSON.stringify(
        transaction,
      )}. Sending it now..`,
    );

    return this.sendSignedTransaction(transaction)
      .then(({ hash }) => {
        this._logger.log(`🎉 The hash of liquidate transaction is: ${hash}`);
        liquidationStatus.set(1);
        criticalStatus.set(1);
      })
      .catch(({ error, hash }) => {
        this._logger.error(`Can not send transaction`, { error, hash });
        liquidationStatus.set(0);
        criticalStatus.set(0);
        return !error && hash;
      });
  }

  /**
   * Get gas estimation from transaction
   * @param transaction
   * @param multiplier
   */
  async getGas(
    transaction: Record<string, any>,
    multiplier = 1.2,
  ): Promise<number> {
    const gas = await Web3Provider.web3.eth.estimateGas({
      ...transaction,
      from: Web3Provider.web3.eth.accounts.privateKeyToAccount(
        this._config.get('ACCOUNT_PRIVATE_KEY'),
      ).address,
    });
    return +(gas * multiplier).toFixed(0);
  }

  /**
   * Estimate gas price.
   */
  async getGasPrice(): Promise<number> {
    let gasPrice = +(await Web3Provider.web3.eth.getGasPrice());
    if (this._config.get('GAS_PRICE') === 'low') {
      gasPrice -= gasPrice * 0.1;
    } else if (this._config.get('GAS_PRICE') === 'medium') {
      gasPrice += gasPrice * 0.2;
    } else if (this._config.get('GAS_PRICE') === 'high') {
      gasPrice += gasPrice * 0.4;
    }
    return +gasPrice.toFixed(0);
  }

  /**
   * Sign transaction with account private key and return raw signature
   * @param transaction
   */
  async getRawSignedTransaction(
    transaction: Record<string, any>,
  ): Promise<string> {
    return (
      await Web3Provider.web3.eth.accounts.signTransaction(
        transaction,
        this._config.get('ACCOUNT_PRIVATE_KEY'),
      )
    ).rawTransaction;
  }

  async sendSignedTransaction(
    transaction: Record<string, any>,
    maxTimeout = RetryService.RETRY_DELAY * 30,
  ): Promise<{ error; hash }> {
    const transactionPromise: Promise<{ error: any; hash: any }> = new Promise(
      async (resolve, reject) => {
        Web3Provider.web3.eth
          .sendSignedTransaction(
            await this.getRawSignedTransaction(transaction),
            (error, hash) => {
              if (!error) {
                resolve({ error, hash });
              } else {
                reject({ error, hash });
              }
            },
          )
          .on('receipt', data => {
            liquidationStatus.set(1);
            criticalStatus.set(1);
            this._logger.log(`📝 Transaction receipt: ${JSON.stringify(data)}`);
          });
      },
    );

    // Make sure transaction is not stuck by using timeout
    const timeoutPromise: Promise<{ error: any; hash: any }> = new Promise(
      (resolve, reject) => {
        setTimeout(() => {
          reject({
            error: new Error(
              `⏰ sendSignedTransaction: Timeout expired: ${maxTimeout}ms`,
            ),
            hash: null,
          });
        }, maxTimeout);
      },
    );

    // Send transaction and get rejected or resolved with the same reason
    return Promise.race([timeoutPromise, transactionPromise]);
  }

  /**
   * Build initial transaction data
   * @param owner
   * @param operatorIds
   * @param cluster
   */
  async buildTransaction({
    owner,
    operatorIds,
    cluster,
  }: {
    owner: string;
    operatorIds: string[] | number[];
    cluster: Record<string, any>;
  }) {
    // Prepare liquidation method signature
    const methodSignature = (
      await Web3Provider.contractCore.methods.liquidate(
        owner,
        Web3Provider.operatorIdsToArray(operatorIds),
        cluster,
      )
    ).encodeABI();

    // Build liquidation transaction base
    const transaction: Record<string, any> = {
      to: Web3Provider.getContractCoreAddress(),
      value: 0,
      nonce: await Web3Provider.web3.eth.getTransactionCount(
        Web3Provider.web3.eth.accounts.privateKeyToAccount(
          this._config.get('ACCOUNT_PRIVATE_KEY'),
        ).address,
        'pending',
      ),
      data: methodSignature,
    };

    // Build gas and gas price values
    transaction.gas = await this.getGas(transaction);
    transaction.gasPrice = await this.getGasPrice();

    return transaction;
  }
}
