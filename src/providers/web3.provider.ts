import Web3 from 'web3';
import ABI_V2 from '@cli/shared/v2.abi.json';

export default class Web3Provider {
  static BLOCK_RANGE_500K = 500000;

  static get web3() {
    return new Web3(process.env.NODE_URL);
  }

  static get abi() {
    return ABI_V2 as any;
  }

  static get contract() {
    return new Web3Provider.web3.eth.Contract(
      Web3Provider.abi,
      process.env.SSV_NETWORK_ADDRESS,
    );
  }

  static async currentBlockNumber(): Promise<number> {
    return await Web3Provider.web3.eth.getBlockNumber();
  }

  static async liquidationThresholdPeriod(): Promise<number> {
    return Web3Provider.contract.methods.getLiquidationThresholdPeriod().call();
  }

  static async minimumBlocksBeforeLiquidation(): Promise<number> {
    return Web3Provider.contract.methods.getLiquidationThresholdPeriod().call();
  }

  static async liquidatable(ownerAddress): Promise<boolean> {
    return Web3Provider.contract.methods.isLiquidatable(ownerAddress).call();
  }

  static async isLiquidated(ownerAddress): Promise<boolean> {
    return Web3Provider.contract.methods
      .isOwnerValidatorsDisabled(ownerAddress)
      .call();
  }

  static async burnRate(ownerAddress): Promise<string> {
    return Web3Provider.contract.methods
      .getAddressBurnRate(ownerAddress)
      .call();
  }

  static async totalBalanceOf(ownerAddress): Promise<string> {
    return Web3Provider.contract.methods.getAddressBalance(ownerAddress).call();
  }
}
