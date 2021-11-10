import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult, getConnection } from 'typeorm';

import { Address } from './address.entity';
import { AddressUsedOperators } from './address-used-operators.entity';
import { ConfService } from '../../shared/services/conf.service';

const Web3 = require('web3');
@Injectable()
export class AddressService {
  private _web3;
  constructor(
    private _config: ConfService,
    @InjectRepository(Address) private _addressRepository: Repository<Address>,
    @InjectRepository(AddressUsedOperators) private _addressUsedOperatorsRepository: Repository<AddressUsedOperators>
  ) {
    this._web3 = new Web3(this._config.get('NODE_URL'));
  }

  async currentBlockNumber(): Promise<number> {
    return await this._web3.eth.getBlockNumber();
  }
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

  async saveUsedOperators(addresses: Address[]): Promise<void> {
    await Promise.all(addresses.map(address => this._addressUsedOperatorsRepository.delete({ ownerAddress: address.ownerAddress })));

    const addressOperators = addresses.reduce((aggr, item) => {
      item.operatorPublicKeys.forEach(operatorPublicKey => aggr.push({ ownerAddress: item.ownerAddress, operatorPublicKey }));
      return aggr;
    }, []);

    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(AddressUsedOperators)
      .values(addressOperators)
      .orIgnore(true)
      .execute();
  }

  async update(address: Address): Promise<UpdateResult> {
    return await this._addressRepository.update(address.ownerAddress, address);
  }

  async delete(id): Promise<DeleteResult> {
    return await this._addressRepository.delete(id);
  }
}
