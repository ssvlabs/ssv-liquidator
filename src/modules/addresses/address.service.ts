import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';

import { Address } from './address.entity';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address) private _addressRepository: Repository<Address>,
  ) {}

  async findAll(): Promise<Address[]> {
    return await this._addressRepository.find();
  }

  async findBy(options: any): Promise<Address[]> {
    return await this._addressRepository.find(options);
  }

  async get(filters: any): Promise<Address> {
    return await this._addressRepository.findOne(filters);
  }

  async create(addresses: Address[]): Promise<void> {
    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Address)
      .values(addresses)
      .orIgnore(true)
      .execute();
  }

  async update(where: any, updates: any): Promise<void> {
    const records = await this.findBy({ where });
    for (const record of records) {
      await this._addressRepository.save({
        ...record,
        ...updates,
        updatedAt: new Date(),
      });
    }
  }

  async remove(where: any): Promise<any> {
    return this._addressRepository.delete(where);
  }
}
