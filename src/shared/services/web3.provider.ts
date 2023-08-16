import Web3 from 'web3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfService } from '@cli/shared/services/conf.service';

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
  private readonly _logger = new Logger(Web3Provider.name);

  private contract: ContractData;
  public web3: Web3;

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
        `Invalid format for ${process.env.SSV_SYNC}. Expected format is version.networkName`,
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
      console.error(
        `Failed to load JSON data from ${contractEnv}.${contractGroup}.abi.json`,
        err,
      );
      throw err;
    }

    let jsonViewsData;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      jsonViewsData = require(`@cli/shared/abi/${contractEnv}.${contractGroup}.views.abi.json`);
    } catch (err) {
      console.error(
        `Failed to load JSON data from ${contractEnv}.${contractGroup}.views.abi.json`,
        err,
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

    this.web3 = new Web3(process.env.NODE_URL);
  }

  get abiCore() {
    return this.contract.abi as any;
  }

  get abiViews() {
    return this.contract.abiViews as any;
  }

  get contractCore() {
    return new this.web3.eth.Contract(this.abiCore, this.contract.address);
  }

  get contractViews() {
    return new this.web3.eth.Contract(
      this.abiViews,
      this.contract.addressViews,
    );
  }

  async currentBlockNumber(): Promise<number> {
    return this.getWithRetry(this.web3.eth.getBlockNumber);
  }

  async getLiquidationThresholdPeriod(): Promise<number> {
    const func = this.contractViews.methods.getLiquidationThresholdPeriod();
    return this.getWithRetry(func.call);
  }

  async liquidatable(owner, operatorIds, clusterSnapshot): Promise<boolean> {
    const func = this.contractViews.methods.isLiquidatable(
      owner,
      this.operatorIdsToArray(operatorIds),
      clusterSnapshot,
    );
    return this.getWithRetry(func.call);
  }

  async isLiquidated(owner, operatorIds, clusterSnapshot): Promise<boolean> {
    const func = this.contractViews.methods.isLiquidated(
      owner,
      this.operatorIdsToArray(operatorIds),
      clusterSnapshot,
    );
    return this.getWithRetry(func.call);
  }

  async getBurnRate(owner, operatorIds, clusterSnapshot): Promise<string> {
    const func = this.contractViews.methods.getBurnRate(
      owner,
      this.operatorIdsToArray(operatorIds),
      clusterSnapshot,
    );
    return this.getWithRetry(func.call);
  }

  async getBalance(owner, operatorIds, clusterSnapshot): Promise<string> {
    const func = this.contractViews.methods.getBalance(
      owner,
      this.operatorIdsToArray(operatorIds),
      clusterSnapshot,
    );
    return this.getWithRetry(func.call);
  }

  async getMinimumLiquidationCollateral(): Promise<string> {
    const func = this.contractViews.methods.getMinimumLiquidationCollateral();
    return this.getWithRetry(func.call);
  }

  async getETHBalance(): Promise<number> {
    if (!process.env.ACCOUNT_PRIVATE_KEY) return 0;

    const account = this.web3.eth.accounts.privateKeyToAccount(
      process.env.ACCOUNT_PRIVATE_KEY,
    );
    const address = account.address;

    const weiBalance = await this.web3.eth.getBalance(address);
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

  async getWithRetry(
    contractMethod: any,
    params: Array<any> = null,
    maxRetries = 3,
    maxTimeout = this.RETRY_DELAY * 2,
  ) {
    let retries = 0;
    let retryDelay = this.RETRY_DELAY;
    while (retries < maxRetries) {
      try {
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `⏰ Web3Service::getWithRetry: Timeout expired: ${maxTimeout}ms`,
              ),
            );
          }, maxTimeout);
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
        console.log(error);
        const methodSignature = `${contractMethod.toString()}(${(params || [])
          .map(p => JSON.stringify(p))
          .join(', ')})`;
        if (error.data && String(error.data).startsWith('0x')) {
          return this.getErrorByHash(error.data);
        } else if (retries + 1 >= maxRetries) {
          this._logger.error(
            `Reached maximum number of retries (${maxRetries}). Method: ${methodSignature}`,
            error,
          );
          throw new Error(error);
        }
        this._logger.warn(
          `[RETRY] Retrying ${
            retries + 1
          } out of ${maxRetries} with delay ${retryDelay}. Method: ${methodSignature}`,
        );
        await this.sleep(retryDelay);
        retries++;
        retryDelay += this.RETRY_DELAY;
      }
    }
  }

  get RETRY_DELAY() {
    return 1000;
  }

  /**
   * Sleep specific amount of ms
   * @param ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
