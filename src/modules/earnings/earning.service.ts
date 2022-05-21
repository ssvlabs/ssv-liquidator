import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, getConnection } from 'typeorm';

import { Earning } from './earning.entity';

@Injectable()
export class EarningService {
  constructor(
    @InjectRepository(Earning) private _earningRepository: Repository<Earning>,
  ) {}

  async findAll(): Promise<Earning[]> {
    return await this._earningRepository.find();
  }

  async findBy(options: any): Promise<Earning[]> {
    return await this._earningRepository.find(options);
  }

  async get(filters: any): Promise<Earning> {
    return await this._earningRepository.findOne(filters);
  }

  async create(items: Earning[]): Promise<void> {
    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Earning)
      .values(items)
      .orIgnore(true)
      .execute();
  }

  async update(item: any): Promise<void> {
    const record = await this._earningRepository.findOne({ hash: item.hash });
    if (record) {
      const updates = Object.keys(item).reduce((aggr, key) => {
        if (record[key] !== item[key]) {
          aggr[key] = item[key];
        }
        return aggr;
      }, {});
      if (Object.keys(updates).length) {
        await this._earningRepository.save({
          ...record,
          ...item,
          updatedAt: new Date(),
        });
      }
    } else {
      await this._earningRepository.save(item);
    }
  }

  async delete(id): Promise<DeleteResult> {
    return await this._earningRepository.delete(id);
  }
}
