import Web3 from 'web3';
import ABI_SSV_NETWORK_CORE from '@cli/shared/abi.ssv-network.json';
import ABI_SSV_NETWORK_VIEWS from '@cli/shared/abi.ssv-network-views.json';
import SolidityErrors from '@cli/providers/solidity-errors.provider';

export default class Web3Provider {
  static get RETRY_DELAY() {
    return 1000;
  }

  static get web3() {
    return new Web3(process.env.NODE_URL);
  }

  static get abiCore() {
    return ABI_SSV_NETWORK_CORE as any;
  }

  static get abiViews() {
    return ABI_SSV_NETWORK_VIEWS as any;
  }

  static get contractCore() {
    return new Web3Provider.web3.eth.Contract(
      Web3Provider.abiCore,
      process.env.SSV_NETWORK_ADDRESS,
    );
  }

  static get contractViews() {
    return new Web3Provider.web3.eth.Contract(
      Web3Provider.abiViews,
      process.env.SSV_NETWORK_VIEWS_ADDRESS,
    );
  }

  static async currentBlockNumber(): Promise<number> {
    return await Web3Provider.web3.eth.getBlockNumber();
  }

  static async minimumBlocksBeforeLiquidation(): Promise<number> {
    return Web3Provider.contractViews.methods
      .getLiquidationThresholdPeriod()
      .call();
  }

  static async liquidatable(
    owner,
    operatorIds,
    clusterSnapshot,
  ): Promise<boolean> {
    return Web3Provider.contractViews.methods
      .isLiquidatable(
        owner,
        Web3Provider.operatorIdsToArray(operatorIds),
        clusterSnapshot,
      )
      .call();
  }

  static async isLiquidated(
    owner,
    operatorIds,
    clusterSnapshot,
  ): Promise<boolean> {
    return Web3Provider.contractViews.methods
      .isLiquidated(
        owner,
        Web3Provider.operatorIdsToArray(operatorIds),
        clusterSnapshot,
      )
      .call();
  }

  static async getBurnRate(
    owner,
    operatorIds,
    clusterSnapshot,
  ): Promise<string> {
    return Web3Provider.contractViews.methods
      .getBurnRate(
        owner,
        Web3Provider.operatorIdsToArray(operatorIds),
        clusterSnapshot,
      )
      .call();
  }

  static async getBalance(
    owner,
    operatorIds,
    clusterSnapshot,
  ): Promise<string> {
    return Web3Provider.contractViews.methods
      .getBalance(
        owner,
        Web3Provider.operatorIdsToArray(operatorIds),
        clusterSnapshot,
      )
      .call();
  }

  static async getMinimumLiquidationCollateral(): Promise<string> {
    return Web3Provider.contractViews.methods
      .getMinimumLiquidationCollateral()
      .call();
  }

  static toClusterTuple(obj) {
    return [
      obj.validatorCount,
      obj.networkFeeIndex,
      obj.index,
      obj.balance,
      obj.active,
    ];
  }

  static operatorIdsToArray(str) {
    return str.split(',').map(Number);
  }

  static async getWithRetry(
    contractMethod: any,
    params: Array<any>,
    maxRetries = 3,
  ) {
    let retries = 0;
    let retryDelay = Web3Provider.RETRY_DELAY;
    while (retries < maxRetries) {
      try {
        return await contractMethod(...params);
      } catch (error) {
        if (error.data && String(error.data).startsWith('0x')) {
          return SolidityErrors.getErrorByHash(error.data);
        } else if (retries + 1 >= maxRetries) {
          console.error(
            '[ERROR]',
            `Reached maximum number of retries (${maxRetries})`,
            `${contractMethod}`,
            params,
          );
          throw new Error(error);
        }
        console.log(
          `[RETRY] Retrying ${
            retries + 1
          } out of ${maxRetries} with delay ${retryDelay}`,
        );
        await sleep(retryDelay);
        retries++;
        retryDelay += Web3Provider.RETRY_DELAY;
      }
    }
  }

  /**
   * Executes promises with a concurrency limit and a timeout for each batch of promises.
   * The code assumes that all promises will settle within a reasonable amount of time.
   * If a promise takes too long to settle, it could cause the function to hang.
   * To avoid this, there is timeout for the Promise.allSettled call.
   * If batch timed out or any of settled nested promises rejected - exception will be thrown.
   *
   * @param promises - An array of promises to execute.
   * @param concurrencyLimit - The maximum number of promises to execute concurrently. Defaults to 10.
   * @param batchTimeout - The maximum time (in milliseconds) to wait for each batch of promises to complete. Defaults to 5 times the retry delay.
   * @returns - An array of results for each promise.
   * @throws - An error indicating that one or more promises failed to resolve.
   */
  static async proceedWithConcurrencyLimit(
    promises: Promise<any>[],
    concurrencyLimit = 10,
    batchTimeout = Web3Provider.RETRY_DELAY * 5,
  ): Promise<PromiseSettledResult<any>[]> {
    /**
     * An array of promises that are currently being executed.
     */
    const toProceed: Promise<any>[] = [];

    /**
     * An array of results for all input promises.
     */
    let results: PromiseSettledResult<any>[] = [];

    for (let i = 0; i < promises.length; i++) {
      toProceed.push(promises[i]);

      if (toProceed.length >= concurrencyLimit || i === promises.length - 1) {
        const batchResults: any = await Promise.race([
          Promise.allSettled(toProceed),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Web3Provider::proceedWithConcurrencyLimit: Batch timed out after ${batchTimeout}ms`,
                  ),
                ),
              batchTimeout,
            ),
          ),
        ]).catch(error => [error]);

        const rejected = batchResults.filter(
          result => result.status === 'rejected',
        );

        if (rejected.length > 0) {
          const errors = rejected.map(result => result.reason);
          throw new Error(
            `Web3Provider::proceedWithConcurrencyLimit: One or more promises failed: ${errors.join(
              ', ',
            )}`,
          );
        }

        results = [...results, ...batchResults];
        toProceed.length = 0;
      }
    }

    return results;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
