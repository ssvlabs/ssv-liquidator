import Web3Provider from '@cli/providers/web3.provider';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, getConnection } from 'typeorm';

import { ConfService } from '@cli/shared/services/conf.service';

import { Earning } from './earning.entity';

@Injectable()
export class EarningService {
  constructor(
    @InjectRepository(Earning) private _earningRepository: Repository<Earning>,
    private _config: ConfService,
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

  async fetch(transactionHash: string): Promise<any> {
    const tx = await Web3Provider.web3.eth.getTransaction(transactionHash);
    const txReceipt = await Web3Provider.web3.eth.getTransactionReceipt(
      transactionHash,
    );

    const earnedData = {
      hash: transactionHash,
      from: txReceipt.from,
      gasPrice: +tx.gasPrice,
      gasUsed: txReceipt.gasUsed,
      earned: null,
      earnedAtBlock: txReceipt.blockNumber,
    };
    const { logs } = txReceipt;
    const transferData = logs.find(
      log =>
        log.address.toLowerCase() ===
        this._config.get('SSV_TOKEN_ADDRESS').toLowerCase(),
    );
    earnedData.earned =
      transferData &&
      +Web3Provider.web3.utils.hexToNumberString(transferData.data);

    return earnedData;
  }

  async update(item: any): Promise<void> {
    const liquidatorAddress =
      Web3Provider.web3.eth.accounts.privateKeyToAccount(
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
