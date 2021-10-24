import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { System, SystemDocument } from './schema/system.schema';

export enum SystemType {
  VALIDATORS_LAST_BLOCK_NUMBER = 'VALIDATORS_LAST_BLOCK_NUMBER',
  BURN_RATES_LAST_BLOCK_NUMBER = 'BURN_RATES_LAST_BLOCK_NUMBER',
}

@Injectable()
export class SystemService {
  constructor(@InjectModel(System.name) private _systemDocument: Model<SystemDocument>) {}

  async save(type: SystemType, payload: any): Promise<void> {
    this._systemDocument.findOneAndUpdate({ type }, { $set: { payload } }, { new: true })
      .lean()
      .exec();
  }

  async get(type: SystemType): Promise<any> {
    const result = await this._systemDocument.findOne({ type }).lean().exec();
    return result?.payload || {};
  }
}
