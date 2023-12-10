import Web3 from 'web3';
import { Injectable } from '@nestjs/common';
import { Retryable } from 'typescript-retry-decorator';

import { ConfService } from '@cli/shared/services/conf.service';
import { Contract } from 'web3-eth-contract';
import { CustomLogger } from '@cli/shared/services/logger.service';

export type NetworkName = string;
export type ContractAddress = string;
export type ContractData = {
  version: string;
  network: string;
  address: ContractAddress;
  addressViews: ContractAddress;
  tokenAddress: string;
  abi: Record<string, any>;
  abiViews: Record<string, any>;
  genesisBlock: number;
};

export type SolidityError = {
  error: string;
  hash: string;
};

export const ERROR_CLUSTER_LIQUIDATED = 'ClusterIsLiquidated';

@Injectable()
export class Web3Provider {
  get contractCore(): Contract {
    return this._contractCore;
  }
  private readonly _logger = new CustomLogger(Web3Provider.name);

  private contract: ContractData;
  public web3: Web3;
  private readonly _contractCore: Contract;
  private readonly _contractViews: Contract;
  private readonly liquidatorAddress: string;

  private _errors: SolidityError[] = [];

  constructor(private _config: ConfService) {
    const contractEnv = this._config.get('SSV_SYNC_ENV');
    const contractGroup = this._config.get('SSV_SYNC');

    // Check if process.env['SSV_SYNC'] exists
    if (!contractGroup) {
      throw new Error('SSV_SYNC is not defined in the environment variables');
    }

    // Check if group is in the expected format
    if (contractGroup.split('.').length !== 2) {
      throw new Error(
        `Invalid format for ${this._config.get(
          'SSV_SYNC',
        )}. Expected format is version.networkName`,
      );
    }

    // Check if process.env.SSV_SYNC_ENV exists
    if (!contractEnv) {
      throw new Error(
        'SSV_SYNC_ENV is not defined in the environment variables',
      );
    }

    let [version, network] = contractGroup.split('.');
    version = version.toUpperCase();
    network = network.toUpperCase();

    let jsonCoreData;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      jsonCoreData = require(`@cli/shared/abi/${contractEnv}.${contractGroup}.abi.json`);
    } catch (err) {
      this._logger.error(
        `Failed to load JSON data from ${contractEnv}.${contractGroup}.abi.json. ${err}`,
      );
      throw err;
    }

    let jsonViewsData;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      jsonViewsData = require(`@cli/shared/abi/${contractEnv}.${contractGroup}.views.abi.json`);
    } catch (err) {
      this._logger.error(
        `Failed to load JSON data from ${contractEnv}.${contractGroup}.views.abi.json. ${err}`,
      );
      throw err;
    }

    // Check if required properties exist in jsonData
    if (
      !jsonCoreData.contractAddress ||
      !jsonCoreData.abi ||
      !jsonCoreData.genesisBlock
    ) {
      throw new Error(
        `Missing core data in JSON for ${contractEnv}.${contractGroup}`,
      );
    }

    // Check if required properties exist in jsonData
    if (!jsonViewsData.contractAddress || !jsonViewsData.abi) {
      throw new Error(
        `Missing views data in JSON for ${contractEnv}.${contractGroup}`,
      );
    }

    this.contract = <ContractData>{
      version,
      network,
      address: jsonCoreData.contractAddress,
      addressViews: jsonViewsData.contractAddress,
      abi: jsonCoreData.abi,
      abiViews: jsonViewsData.abi,
      genesisBlock: jsonCoreData.genesisBlock,
    };

    for (const item of this.abiCore) {
      if (item['type'] === 'error') {
        const inputTypes = [];
        for (const input of item['inputs'] || []) {
          inputTypes.push(input['type']);
        }
        const error = `${item['name']}(${inputTypes.join(',')})`;
        this._errors.push(<SolidityError>{
          error,
          hash: new Web3().utils.keccak256(error).substring(0, 10),
        });
      }
    }

    this.web3 = new Web3(this._config.get('NODE_URL'));
    this.liquidatorAddress = this.web3.eth.accounts.privateKeyToAccount(
      this._config.get('ACCOUNT_PRIVATE_KEY'),
    ).address;
    this._contractCore = new this.web3.eth.Contract(
      this.abiCore,
      this.contract.address,
    );
    this._contractViews = new this.web3.eth.Contract(
      this.abiViews,
      this.contract.addressViews,
    );
  }

  get abiCore() {
    return this.contract.abi as any;
  }

  get abiViews() {
    return this.contract.abiViews as any;
  }

  async printConfig() {
    this._logger.log(`Liquidator address: ${this.liquidatorAddress}`);
    this._logger.log(
      `Liquidator balance: ${await this.getLiquidatorETHBalance()} ETH`,
    );
  }

  getOwnerAndOperatorsStr(owner, operatorIds): string {
    return `{ owner '${owner}', operatorIds '${operatorIds}' }`;
  }

  @Retryable(Web3Provider.RETRY_OPTIONS)
  async currentBlockNumber(): Promise<number> {
    return this.web3.eth.getBlockNumber();
  }

  @Retryable(Web3Provider.RETRY_OPTIONS)
  async getLiquidationThresholdPeriod(): Promise<number> {
    return this._contractViews.methods
      .getLiquidationThresholdPeriod()
      .call()
      .catch(err => {
        this._logger.warn(
          `getLiquidationThresholdPeriod ${JSON.stringify(
            this.getErrorByHash(err.data),
          )}`,
        );
        return;
      });
  }

  @Retryable(Web3Provider.RETRY_OPTIONS)
  async liquidatable(owner, operatorIds, clusterSnapshot): Promise<boolean> {
    return this._contractViews.methods
      .isLiquidatable(
        owner,
        this.operatorIdsToArray(operatorIds),
        clusterSnapshot,
      )
      .call()
      .catch(err => {
        this._logger.warn(`liquidatable ${JSON.stringify(
          this.getErrorByHash(err.data) || err,
        )}
          ${this.getOwnerAndOperatorsStr(owner, operatorIds)}`);
        return;
      });
  }

  @Retryable(Web3Provider.RETRY_OPTIONS)
  async isLiquidated(owner, operatorIds, clusterSnapshot): Promise<boolean> {
    return this._contractViews.methods
      .isLiquidated(
        owner,
        this.operatorIdsToArray(operatorIds),
        clusterSnapshot,
      )
      .call()
      .catch(err => {
        this._logger.warn(`isLiquidated ${JSON.stringify(
          this.getErrorByHash(err.data) || err,
        )}
          ${this.getOwnerAndOperatorsStr(owner, operatorIds)}`);
        return;
      });
  }

  @Retryable(Web3Provider.RETRY_OPTIONS)
  async getBurnRate(owner, operatorIds, clusterSnapshot): Promise<string> {
    return this._contractViews.methods
      .getBurnRate(owner, this.operatorIdsToArray(operatorIds), clusterSnapshot)
      .call()
      .catch(err => {
        this._logger.warn(`getBurnRate ${JSON.stringify(
          this.getErrorByHash(err.data) || err,
        )}
          ${this.getOwnerAndOperatorsStr(owner, operatorIds)}`);
        return;
      });
  }

  @Retryable(Web3Provider.RETRY_OPTIONS)
  async getBalance(owner, operatorIds, clusterSnapshot): Promise<string> {
    return this._contractViews.methods
      .getBalance(owner, this.operatorIdsToArray(operatorIds), clusterSnapshot)
      .call()
      .catch(err => {
        this._logger.warn(`getBalance ${JSON.stringify(
          this.getErrorByHash(err.data) || err,
        )}
          ${this.getOwnerAndOperatorsStr(owner, operatorIds)}`);
        return;
      });
  }

  @Retryable(Web3Provider.RETRY_OPTIONS)
  async getMinimumLiquidationCollateral(): Promise<string> {
    return this._contractViews.methods
      .getMinimumLiquidationCollateral()
      .call()
      .catch(err => {
        this._logger.warn(
          `getMinimumLiquidationCollateral ${JSON.stringify(
            this.getErrorByHash(err.data),
          )}`,
        );
        return;
      });
  }

  async getLiquidatorETHBalance(): Promise<number> {
    const weiBalance = await this.web3.eth.getBalance(this.liquidatorAddress);
    const ethBalance = this.web3.utils.fromWei(weiBalance, 'ether');
    return +ethBalance;
  }

  operatorIdsToArray(str) {
    return str.split(',').map(Number);
  }

  getGenesisBlock() {
    return this.contract.genesisBlock;
  }

  getTokenAddress() {
    return this.contract.tokenAddress;
  }

  getContractCoreAddress() {
    return this.contract.address;
  }

  /**
   * Build and return all the solidity errors from abi signatures of errors.
   */
  get errors(): SolidityError[] {
    if (this._errors.length) {
      return this._errors;
    }
    for (const item of this.abiCore) {
      if (item['type'] === 'error') {
        const inputTypes = [];
        for (const input of item['inputs'] || []) {
          inputTypes.push(input['type']);
        }
        const error = `${item['name']}(${inputTypes.join(',')})`;
        this._errors.push(<SolidityError>{
          error,
          hash: new Web3().utils.keccak256(error).substring(0, 10),
        });
      }
    }
    return this._errors;
  }

  /**
   * Try to match error by its hash from abi signatures.
   * @param hash
   */
  getErrorByHash(hash: string): SolidityError | null {
    for (const error of this._errors) {
      if (error.hash.startsWith(hash)) {
        return error;
      }
    }
    return null;
  }

  isError(solidityError: SolidityError, error: string): boolean {
    return String(solidityError.error).indexOf(error) !== -1;
  }

  static get RETRY_DELAY() {
    return 1000;
  }

  static RETRY_OPTIONS = {
    maxAttempts: 3,
    backOff: Web3Provider.RETRY_DELAY,
    useConsoleLogger: true,
    useOriginalError: true,
  };
}
