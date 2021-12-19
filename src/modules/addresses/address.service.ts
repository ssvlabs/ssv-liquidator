import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult, getConnection } from 'typeorm';

import { Address } from './address.entity';
import { ConfService } from '../../shared/services/conf.service';

const Web3 = require('web3');
const CONTRACT_ABI = require('../../shared/abi-ssv-network.json');
@Injectable()
export class AddressService {
  private _web3;
  constructor(
    private _config: ConfService,
    @InjectRepository(Address) private _addressRepository: Repository<Address>,
  ) {
    this._web3 = new Web3(this._config.get('NODE_URL'));
  }

  async currentBlockNumber(): Promise<number> {
    return await this._web3.eth.getBlockNumber();
  }

  async minimumBlocksBeforeLiquidation(): Promise<number> {
    const contract = new this._web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
    return contract.methods.minimumBlocksBeforeLiquidation().call();
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

  async update(address: any): Promise<void> {
    const record = await this._addressRepository.findOne({ ownerAddress: address.ownerAddress });
    const updates = Object.keys(address).reduce((aggr, key) => {
      if (record[key] !== address[key]) {
        aggr[key] = address[key];
      }
      return aggr;
    }, {});
    if (Object.keys(updates).length) {
      await this._addressRepository.save({
        ...record,
        ...address,
        updatedAt: new Date()
      });
    }
  }

  async delete(id): Promise<DeleteResult> {
    return await this._addressRepository.delete(id);
  }
}
