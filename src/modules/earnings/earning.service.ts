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

  async fetch(transactionHash: string): Promise<any> {
    const tx = await this._web3Provider.web3.eth.getTransaction(
      transactionHash,
    );
    const txReceipt = await this._web3Provider.web3.eth.getTransactionReceipt(
      transactionHash,
    );

    if (!txReceipt) {
      return null;
    }

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
      log => log.address.toLowerCase() === this._web3Provider.getTokenAddress(),
    );
    earnedData.earned =
      transferData &&
      +this._web3Provider.web3.utils.hexToNumberString(transferData.data);

    return earnedData;
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
