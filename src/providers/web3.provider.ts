import Web3 from 'web3';
import ABI_SSV_NETWORK_CORE from '@cli/shared/abi.ssv-network.json';
import ABI_SSV_NETWORK_VIEWS from '@cli/shared/abi.ssv-network-views.json';

export default class Web3Provider {
  static BLOCK_RANGE_500K = 500_000;

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

  static async getClusterBurnRate(
    owner,
    operatorIds,
    clusterSnapshot,
  ): Promise<string> {
    return Web3Provider.contractViews.methods
      .getClusterBurnRate(
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
}
