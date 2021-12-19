import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { System } from './system.entity';

export enum SystemType {
  NEW_VALIDATORS_LAST_BLOCK_NUMBER = 'NEW_VALIDATORS_LAST_BLOCK_NUMBER',
  UPDATED_VALIDATORS_LAST_BLOCK_NUMBER = 'UPDATED_VALIDATORS_LAST_BLOCK_NUMBER',
  BURN_RATES_LAST_BLOCK_NUMBER = 'BURN_RATES_LAST_BLOCK_NUMBER',
  LIQUIDATED_LAST_BLOCK_NUMBER = 'LIQUIDATED_LAST_BLOCK_NUMBER',
  DEPOSITED_LAST_BLOCK_NUMBER = 'DEPOSITED_LAST_BLOCK_NUMBER',
  WITHDRAWN_LAST_BLOCK_NUMBER = 'WITHDRAWN_LAST_BLOCK_NUMBER',
}

@Injectable()
export class SystemService {
  constructor(@InjectRepository(System) private _systemRepository: Repository<System>) {}

  async get(type: SystemType): Promise<any> {
    const result = await this._systemRepository.findOne({ type });
    return result && result.payload
      ? JSON.parse(result.payload)
      : null;
  }

  async save(type: SystemType, payload: any): Promise<void> {
    if (await this.get(type)) {
      await this._systemRepository.update(type, { payload: JSON.stringify(payload) });
    } else {
      await this._systemRepository.save({ type, payload: JSON.stringify(payload) });
    }
  }
}
