import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Validator, ValidatorDocument } from './schema/validator.schema';
@Injectable()
export class ValidatorService {
  constructor(@InjectModel(Validator.name) private _validatorDocument: Model<ValidatorDocument>) {}

  async saveMany(validators: any): Promise<void> {
    const bulkUpdateOps = validators.reduce((aggr, event) => {
      aggr.push({
        updateOne: {
          filter: { id: event.id },
          update: {
            $set: { ...event },
          },
          upsert: true,
          setDefaultsOnInsert: true,
        },
      });
      return aggr;
    }, []);
    await this._validatorDocument.bulkWrite(bulkUpdateOps);
  }

  async list(filter: any): Promise<Validator[]> {
    return this._validatorDocument.find(filter).lean().exec();
  }
}
