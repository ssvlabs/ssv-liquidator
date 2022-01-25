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

  async create(addresses: Earning[]): Promise<void> {
    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Earning)
      .values(addresses)
      .orIgnore(true)
      .execute();
  }

  async update(address: any): Promise<void> {
    const record = await this._earningRepository.findOne({ ownerAddress: address.ownerAddress });
    if (record) {
      const updates = Object.keys(address).reduce((aggr, key) => {
        if (record[key] !== address[key]) {
          aggr[key] = address[key];
        }
        return aggr;
      }, {});
      if (Object.keys(updates).length) {
        await this._earningRepository.save({
          ...record,
          ...address,
          updatedAt: new Date()
        });
      }  
    } else {
      await this._earningRepository.save(address);
    }
  }

  async delete(id): Promise<DeleteResult> {
    return await this._earningRepository.delete(id);
  }
}
