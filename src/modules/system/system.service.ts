import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { System } from './system.entity';

export enum SystemType {
  GENERAL_LAST_BLOCK_NUMBER = 'GENERAL_LAST_BLOCK_NUMBER',
  EARNINGS_LAST_BLOCK_NUMBER = 'EARNINGS_LAST_BLOCK_NUMBER',
  // event names
  EVENT_OPERATOR_ADDED = 'OperatorRegistration',
  EVENT_OPERATOR_REMOVED = 'OperatorRemoval',
  EVENT_OPERATOR_FEE_APPROVED = 'OperatorFeeExecution',
  EVENT_VALIDATOR_ADDED = 'ValidatorRegistration',
  EVENT_VALIDATOR_REMOVED = 'ValidatorRemoval',
  EVENT_ACCOUNT_LIQUIDATED = 'AccountLiquidation',
  EVENT_FUNDS_DEPOSITED = 'FundsDeposit',
  EVENT_FUNDS_WITHDRAWN = 'FundsWithdrawal',
}

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(System) private _systemRepository: Repository<System>,
  ) {}

  async get(type: SystemType): Promise<any> {
    const result = await this._systemRepository.findOne({ type });
    return result && result.payload ? JSON.parse(result.payload) : null;
  }

  async save(type: SystemType, payload: any): Promise<void> {
    if (await this.get(type)) {
      await this._systemRepository.update(type, {
        payload: JSON.stringify(payload),
      });
    } else {
      await this._systemRepository.save({
        type,
        payload: JSON.stringify(payload),
      });
    }
  }
}
