import Web3 from 'web3';
import ABI_SSV_NETWORK_CORE from '@cli/shared/abi.ssv-network.json';
import ABI_SSV_NETWORK_VIEWS from '@cli/shared/abi.ssv-network-views.json';
import SolidityErrors from '@cli/providers/solidity-errors.provider';

export default class Web3Provider {
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
    while (retries < maxRetries) {
      try {
        const result = await contractMethod(...params);
        return result;
      } catch (error) {
        if (error.data !== null && error.data.startsWith('0x')) {
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
        retries++;
        await sleep(1000); // wait for 1 second before retrying
      }
    }
  }

  static async proceedWithConcurrencyLimit(promises, concurrencyLimit = 10) {
    const toProceed = [];
    let results = [];

    for (let i = 0; i < promises.length; i++) {
      toProceed.push(promises[i]);
      if (toProceed.length >= concurrencyLimit || i === promises.length - 1) {
        results = [...results, ...(await Promise.allSettled(toProceed))];
        toProceed.length = 0;
      }
    }

    return results;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
