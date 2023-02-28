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

  static async liquidatable(owner): Promise<boolean> {
    return Web3Provider.contractViews.methods
      .isLiquidatable(owner)
      .call();
  }

  static async isLiquidated(owner): Promise<boolean> {
    return Web3Provider.contractViews.methods
      .isOwnerValidatorsDisabled(owner)
      .call();
  }

  static async getClusterBurnRate(owner): Promise<string> {
    return Web3Provider.contractViews.methods
      .getAddressBurnRate(owner)
      .call();
  }

  static async getBalance(owner): Promise<string> {
    return Web3Provider.contractViews.methods.getBalance(owner).call();
  }
}
