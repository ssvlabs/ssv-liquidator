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
    params: Array<any> = null,
    maxRetries = 3,
  ) {
    let retries = 0;
    let retryDelay = Web3Provider.RETRY_DELAY;
    while (retries < maxRetries) {
      try {
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                '[TIMEOUT] Web3Provider::getWithRetry: Timeout expired',
              ),
            );
          }, Web3Provider.RETRY_DELAY * 2);
        });
        return await Promise.race([
          timeoutPromise,
          contractMethod(...(params || [])),
        ])
          .then(result => result)
          .catch(error => {
            throw error;
          });
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
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
