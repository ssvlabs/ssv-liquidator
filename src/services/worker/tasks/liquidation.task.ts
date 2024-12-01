import { LessThanOrEqual } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Cluster } from '@cli/modules/clusters/cluster.entity';
import { ConfService } from '@cli/shared/services/conf.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';
import { SystemService, SystemType } from '@cli/modules/system/system.service';
import { Web3Provider } from '@cli/shared/services/web3.provider';
import { SSVLiquidatorException } from '@cli/exceptions/base';

@Injectable()
export class LiquidationTask {
  public static isProcessLocked = false;
  private readonly _logger = new Logger(LiquidationTask.name);
  private readonly alreadyLiquidatedClusterUpdates = {
    balance: null,
    burnRate: null,
    isLiquidated: true,
    liquidationBlockNumber: null,
  };

  constructor(
    private _config: ConfService,
    private _metrics: MetricsService,
    private _clusterService: ClusterService,
    private _systemService: SystemService,
    private _web3Provider: Web3Provider,
  ) { }

  static get BLOCK_RANGE() {
    return 10;
  }

  async liquidate(): Promise<void> {
    if (LiquidationTask.isProcessLocked) {
      this._logger.log(`Process is already locked`);
      return;
    }
    LiquidationTask.isProcessLocked = true;

    try {
      const latestSyncedBlockNumber = await this._systemService.get(
        SystemType.GENERAL_LAST_BLOCK_NUMBER,
      );

      const latestBlockNumber =
        +(await this._web3Provider.web3.eth.getBlockNumber());

      if (
        latestSyncedBlockNumber + LiquidationTask.BLOCK_RANGE <
        latestBlockNumber
      ) {
        this._logger.debug(`Ignore task. Events are not fully synced yet.`);
        LiquidationTask.isProcessLocked = false;
        return;
      }

      const toLiquidateRecords = await this._clusterService.findBy({
        where: {
          liquidationBlockNumber: LessThanOrEqual(
            // Current block
            // than the block number when balance becomes zero if not liquidated
            latestBlockNumber,
          ),
        },
      });
      const clustersToLiquidate: Cluster[] = [];
      for (const item of toLiquidateRecords) {
        item.cluster = JSON.parse(item.cluster);
        const logItem = JSON.stringify(item);

        try {
          this._logger.log(
            `Checking in a contract that cluster is liquidatable: ${logItem}`,
          );
          const canLiquidateCluster = await this._web3Provider.liquidatable(
            item.owner,
            item.operatorIds,
            item.cluster,
          );
          if (canLiquidateCluster) {
            this._logger.log(`YES. Cluster is liquidatable: ${logItem}`);
            clustersToLiquidate.push(item);
          } else {
            this._logger.log(
              `Checking in a contract if cluster has already been liquidated: ${logItem}`,
            );
            const isLiquidated = await this._web3Provider.isLiquidated(
              item.owner,
              item.operatorIds,
              item.cluster,
            );
            this._logger.log(
              `${isLiquidated ? 'YES' : 'NO'}. Cluster has ${isLiquidated ? '' : 'NOT'
              } been liquidated: ${logItem}`,
            );
            if (isLiquidated) {
              const updated = await this._clusterService.update(
                { owner: item.owner, operatorIds: item.operatorIds },
                this.alreadyLiquidatedClusterUpdates,
              );
              if (updated) {
                this._logger.log(
                  `Updated liquidated cluster: ${JSON.stringify({
                    ...item,
                    ...this.alreadyLiquidatedClusterUpdates,
                  })}`,
                );
              }
            }
          }
          this._metrics.liquidationStatus.set(1);
        } catch (error) {
          this._logger.error(
            `Error occurred during cluster liquidation preparations: ${JSON.stringify(
              {
                ...item,
                ...this.alreadyLiquidatedClusterUpdates,
              },
            )}`,
            error,
          );
          this._metrics.liquidationStatus.set(0);
        }
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
    } catch (e) {
      this._logger.error(`Failed to liquidate. Error: ${JSON.stringify(e)}`);
    } finally {
      LiquidationTask.isProcessLocked = false;
      this._metrics.liquidationStatus.set(1);
    }
  }

  /**
   * Receives Cluster db record and sends liquidation request
   * @param item
   * @private
   */
  private async liquidateCluster(item: any): Promise<void> {
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

    try {
      const { hash } = await this.sendSignedTransaction(transaction);
      this._logger.log(`🔃 The hash of liquidate transaction is: ${hash}`);
      await this.waitForTransactionConfirmation(hash);
      this._metrics.liquidationStatus.set(1);
    } catch (error) {
      this._metrics.liquidationStatus.set(0);

      const solidityError = this._web3Provider.getErrorByHash(error.data);
      if (
        solidityError &&
        (solidityError.error.includes('IncorrectClusterState') ||
          solidityError.error.includes('ClusterIsLiquidated') ||
          solidityError.error.includes('ClusterNotLiquidatable'))
      ) {
        const updated = await this._clusterService.update(
          { owner: item.owner, operatorIds: item.operatorIds },
          this.alreadyLiquidatedClusterUpdates,
        );
        if (updated) {
          this._logger.log(
            `Updated liquidated cluster: ${JSON.stringify({
              ...item,
              ...this.alreadyLiquidatedClusterUpdates,
            })}`,
          );
        }
        this._logger.error(
          `The cluster ${item.owner} ${item.operatorIds} is not possible to liquidate. Reason: ${solidityError.error}`,
        );
      }
    }
  }

  private async waitForTransactionConfirmation(hash: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const receipt =
            await this._web3Provider.web3.eth.getTransactionReceipt(hash);
          if (receipt) {
            clearInterval(checkInterval);
            if (receipt.status) {
              this._logger.log(`🎉 The cluster is liquidated: ${hash}`);
              resolve();
            } else {
              await this.catchRevertReason(hash);
            }
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 5000); // Check every 5 seconds
    });
  }

  async catchRevertReason(hash: string): Promise<string> {
    try {
      // Get the transaction by hash
      const tx = await this._web3Provider.web3.eth.getTransaction(hash);

      // Prepare a call to simulate the transaction execution
      const result = await this._web3Provider.web3.eth.call(
        {
          to: tx.to,
          data: tx.input,
          from: tx.from,
          value: tx.value,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
        },
        tx.blockNumber,
      );

      // The result will be the revert reason string encoded as bytes
      // Decode the revert reason (the result is prefixed with '0x08c379a0' which is the method ID for Error(string))
      if (result.startsWith('0x08c379a0')) {
        const reason = this._web3Provider.web3.utils.toAscii(
          result.substring(138),
        );
        throw new SSVLiquidatorException(
          `Tx reverted reason is ${reason}`,
          reason,
          hash,
        );
      } else {
        throw new SSVLiquidatorException(
          'Revert reason could not be determined',
          null,
          hash,
        );
      }
    } catch (error) {
      throw new SSVLiquidatorException(
        `Error revert reason: ${error.message}`,
        error.data,
        hash,
      );
    }
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
    const gas = await this._web3Provider.web3.eth.estimateGas({
      ...transaction,
      from: this._web3Provider.web3.eth.accounts.privateKeyToAccount(
        this._config.get('ACCOUNT_PRIVATE_KEY'),
      ).address,
    });
    return +(gas * multiplier).toFixed(0);
  }

  /**
   * Estimate gas price.
   */
  async getGasPrice(): Promise<number> {
    let gasPrice = +(await this._web3Provider.web3.eth.getGasPrice());
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
      await this._web3Provider.web3.eth.accounts.signTransaction(
        transaction,
        this._config.get('ACCOUNT_PRIVATE_KEY'),
      )
    ).rawTransaction;
  }

  async sendSignedTransaction(
    transaction: Record<string, any>,
    maxTimeout = 1000 * 60,
  ): Promise<{ error; hash }> {
    try {
      const signedTx = await this.getRawSignedTransaction(transaction);
      return new Promise((resolve, reject) => {
        this._web3Provider.web3.eth
          .sendSignedTransaction(signedTx)
          .on('transactionHash', hash => resolve({ error: null, hash }))
          .on('error', error => reject({ error, hash: null }));

        setTimeout(() => {
          reject({
            error: new Error(
              `sendSignedTransaction: Timeout expired: ${maxTimeout}ms`,
            ),
            hash: null,
          });
        }, maxTimeout);
      });
    } catch (error) {
      return Promise.reject({ error, hash: null });
    }
    /*
    const transactionPromise: Promise<{ error: any; hash: any }> = new Promise(
      async (resolve, reject) => {
        this._web3Provider.web3.eth
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
            this._metrics.liquidationStatus.set(1);
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
    */
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
      await this._web3Provider.contractCore.methods.liquidate(
        owner,
        this._web3Provider.operatorIdsToArray(operatorIds),
        cluster,
      )
    ).encodeABI();

    // Build liquidation transaction base
    const transaction: Record<string, any> = {
      to: this._web3Provider.getContractCoreAddress(),
      value: 0,
      nonce: await this._web3Provider.web3.eth.getTransactionCount(
        this._web3Provider.web3.eth.accounts.privateKeyToAccount(
          this._config.get('ACCOUNT_PRIVATE_KEY'),
        ).address,
        'pending',
      ),
      data: methodSignature,
    };

    // Build gas and gas price values
    const totalOperators =
      this._web3Provider.operatorIdsToArray(operatorIds).length;
    transaction.gas = this._config.gasUsage(); // totalOperators
    if (!transaction.gas) {
      this._logger.error(
        `Gas group was not found for ${totalOperators} operators. Going to estimate transaction gas...`,
      );
      transaction.gas = await this.getGas(transaction);
    } else {
      this._logger.log(
        `Gas group was found for ${totalOperators} operators and is: ${transaction.gas}`,
      );
    }

    transaction.gasPrice = await this.getGasPrice();

    return transaction;
  }
}
