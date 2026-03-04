import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';

import { ConfService } from '@cli/shared/services/conf.service';
import { Web3Provider } from '@cli/shared/services/web3.provider';

import { Earning } from './earning.entity';

@Injectable()
export class EarningService {
  constructor(
    @InjectRepository(Earning) private _earningRepository: Repository<Earning>,
    private _config: ConfService,
    private _web3Provider: Web3Provider,
  ) {}

  async findAll(): Promise<Earning[]> {
    return this._earningRepository.find();
  }

  async findBy(options: any): Promise<Earning[]> {
    return this._earningRepository.find(options);
  }

  async get(filters: any): Promise<Earning> {
    return this._earningRepository.findOne(filters);
  }

  async create(items: Earning[]): Promise<void> {
    await this._earningRepository.insert(items);
  }

  async update(item: any): Promise<void> {
    const liquidatorAddress =
      this._web3Provider.web3.eth.accounts.privateKeyToAccount(
        this._config.get('ACCOUNT_PRIVATE_KEY'),
      ).address;
    if (item.from.toLowerCase() !== liquidatorAddress.toLocaleLowerCase())
      return;
    await this._earningRepository.save(item);
  }

  async delete(id): Promise<DeleteResult> {
    return this._earningRepository.delete(id);
  }
}
