import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, getConnection } from 'typeorm';

import { Address } from './address.entity';
import { ConfService } from '../../shared/services/conf.service';

const Web3 = require('web3');
const CONTRACT_ABI = require('../../shared/abi-ssv-network.json');
@Injectable()
export class AddressService {
  private _web3;
  private _contract;
  constructor(
    private _config: ConfService,
    @InjectRepository(Address) private _addressRepository: Repository<Address>,
  ) {
    this._web3 = new Web3(this._config.get('NODE_URL'));
    this._contract = new this._web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
  }

  async currentBlockNumber(): Promise<number> {
    return await this._web3.eth.getBlockNumber();
  }

  async minimumBlocksBeforeLiquidation(): Promise<number> {
    return this._contract.methods.minimumBlocksBeforeLiquidation().call();
  }

  async liquidatable(ownerAddress): Promise<boolean> {
    return this._contract.methods.liquidatable(ownerAddress).call();
  }

  async isLiquidated(ownerAddress): Promise<boolean> {
    return this._contract.methods.isOwnerValidatorsDisabled(ownerAddress).call();
  }

  async burnRate(ownerAddress): Promise<string> {
    return this._contract.methods.burnRate(ownerAddress).call();
  }

  async totalBalanceOf(ownerAddress): Promise<string> {
    return this._contract.methods.totalBalanceOf(ownerAddress).call();
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
    if (record) {
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
    } else {
      await this._addressRepository.save(address);
    }
  }

  async delete(id): Promise<DeleteResult> {
    return await this._addressRepository.delete(id);
  }
}
