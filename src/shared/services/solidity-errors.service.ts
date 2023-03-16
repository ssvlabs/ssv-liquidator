import { Injectable } from '@nestjs/common';
import abi from '@cli/shared/abi.ssv-network.json';
import Web3Provider from '@cli/providers/web3.provider';
import { ConfService } from '@cli/shared/services/conf.service';

export type SolidityError = {
  error: string;
  hash: string;
};

@Injectable()
export class SolidityErrorsService {
  private _errors: SolidityError[] = [];

  constructor(private _configService: ConfService) {}

  /**
   * Build and return all the solidity errors from abi signatures of errors.
   */
  get errors(): SolidityError[] {
    if (this._errors.length) {
      return this._errors;
    }
    for (const item of abi) {
      if (item['type'] === 'error') {
        const inputTypes = [];
        for (const input of item['inputs'] || []) {
          inputTypes.push(input['type']);
        }
        const error = `${item['name']}(${inputTypes.join(',')})`;
        this._errors.push(<SolidityError>{
          error,
          hash: Web3Provider.web3.utils.keccak256(error).substring(0, 10),
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
    for (const error of this.errors) {
      if (error.hash.startsWith(hash)) {
        return error;
      }
    }
    return null;
  }

  isError(solidityError: SolidityError, error: string): boolean {
    return solidityError.error.startsWith(error);
  }
}
