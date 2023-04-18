import Web3 from 'web3';
import ABI_SSV_NETWORK_CORE from '@cli/shared/abi.ssv-network.json';

export type SolidityError = {
  error: string;
  hash: string;
};

export default class SolidityErrors {
  static ERROR_CLUSTER_LIQUIDATED = 'ClusterIsLiquidated';

  static _errors: SolidityError[] = [];

  /**
   * Build and return all the solidity errors from abi signatures of errors.
   */
  static get errors(): SolidityError[] {
    if (SolidityErrors._errors.length) {
      return SolidityErrors._errors;
    }
    for (const item of ABI_SSV_NETWORK_CORE) {
      if (item['type'] === 'error') {
        const inputTypes = [];
        for (const input of item['inputs'] || []) {
          inputTypes.push(input['type']);
        }
        const error = `${item['name']}(${inputTypes.join(',')})`;
        SolidityErrors._errors.push(<SolidityError>{
          error,
          hash: new Web3().utils.keccak256(error).substring(0, 10),
        });
      }
    }
    return SolidityErrors._errors;
  }

  /**
   * Try to match error by its hash from abi signatures.
   * @param hash
   */
  static getErrorByHash(hash: string): SolidityError | null {
    for (const error of SolidityErrors.errors) {
      if (error.hash.startsWith(hash)) {
        return error;
      }
    }
    return null;
  }

  static isError(solidityError: SolidityError, error: string): boolean {
    return String(solidityError.error).startsWith(error);
  }
}
