import Web3 from 'web3';

export type NetworkName = string;
export type ContractAddress = string;
export type ContractData = {
  version: string;
  network: string;
  address: ContractAddress;
  addressViews: ContractAddress;
  abi: Record<string, any>;
  abiViews: Record<string, any>;
  genesisBlock: number;
};

const contractEnv = process.env.SSV_SYNC_ENV;
const contractGroup = process.env.SSV_SYNC;

// Check if process.env['SSV_SYNC'] exists
if (!contractGroup) {
  throw new Error('SSV_SYNC is not defined in the environment variables');
}

// Check if group is in the expected format
if (contractGroup.split('.').length !== 2) {
  throw new Error(
    `Invalid format for ${process.env.SSV_SYNC}. Expected format is version.networkName`,
  );
}

// Check if process.env.SSV_SYNC_ENV exists
if (!contractEnv) {
  throw new Error('SSV_SYNC_ENV is not defined in the environment variables');
}

let [version, network] = contractGroup.split('.');
version = version.toUpperCase();
network = network.toUpperCase();

let jsonData;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jsonData = require(`@cli/shared/abi/${contractEnv}.${contractGroup}.abi.json`);
} catch (err) {
  console.error(
    `Failed to load JSON data from ${contractEnv}.${contractGroup}.abi.json`,
    err,
  );
  throw err;
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require(`@cli/shared/abi/${contractEnv}.${contractGroup}.view.abi.json`);
} catch (err) {
  console.error(
    `Failed to load JSON data from ${contractEnv}.${contractGroup}.view.abi.json`,
    err,
  );
  throw err;
}

// Check if required properties exist in jsonData
if (!jsonData.contractAddress || !jsonData.abi || !jsonData.genesisBlock) {
  throw new Error(`Missing data in JSON for ${contractEnv}.${contractGroup}`);
}

const contract: ContractData = <ContractData>{
  version,
  network,
  address: jsonData.contractAddress,
  addressViews: jsonData.contractAddressView,
  abi: jsonData.abi,
  abiViews: require(`@cli/shared/abi/${contractEnv}.${contractGroup}.view.abi.json`),
  genesisBlock: jsonData.genesisBlock,
};

export default class Web3Provider {
  static get web3() {
    return new Web3(process.env.NODE_URL);
  }

  static get abiCore() {
    return contract.abi as any;
  }

  static get abiViews() {
    return contract.abiViews as any;
  }

  static get contractCore() {
    return new Web3Provider.web3.eth.Contract(
      Web3Provider.abiCore,
      contract.address,
    );
  }

  static get contractViews() {
    return new Web3Provider.web3.eth.Contract(
      Web3Provider.abiViews,
      contract.addressViews,
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

  static operatorIdsToArray(str) {
    return str.split(',').map(Number);
  }

  static getGenesisBlock() {
    return contract.genesisBlock;
  }
}
