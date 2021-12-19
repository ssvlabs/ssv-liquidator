import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LessThanOrEqual } from 'typeorm';

import { QueuesEnum, TasksQueuesEnum } from '../../../queues/enums/tasks.enum';
import { SystemService, SystemType } from '../../../modules/system/system.service';
import { AddressService } from '../../../modules/addresses/address.service';
import { ConfService } from '../../../shared/services/conf.service';
import UtilsService from '../../../providers/utils.service';
const Web3 = require('web3');

const CONTRACT_ABI = require('../../../shared/abi-ssv-network.json');
@Processor(QueuesEnum.LIQUIDATION)
export class LiquidationTask {
  constructor(
    private _config: ConfService,
    private _addressService: AddressService,
    private _systemService: SystemService
  ) {}

  @Process(TasksQueuesEnum.LIQUIDATE.name)
  async liquidate(job: Job): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching register validator events...`);
    try {
      const web3 = new Web3(this._config.get('NODE_URL'));
      const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
      const minimumBlocksBeforeLiquidation = +await this._addressService.minimumBlocksBeforeLiquidation();
      const currentBlockNumber = +await this._addressService.currentBlockNumber();
      const toLiquidateRecords = await this._addressService.findBy({
        where: { liquidateAtBlock: LessThanOrEqual(currentBlockNumber + minimumBlocksBeforeLiquidation) },
        take: this._config.get('LIQUIDATE_BATCH_SIZE'),
      });
      for (const { ownerAddress } of toLiquidateRecords) {
        const liquidatable = await contract.methods.liquidatable(ownerAddress).call();
        if (liquidatable) {
          const data = (await contract.methods.liquidate(ownerAddress)).encodeABI();
          const transaction = {
            to: this._config.get('SSV_NETWORK_ADDRESS'),
            value: 0,
            gas: +this._config.get('GAS'),
            gasPrice: +this._config.get('GAS_PRICE'),
            nonce: await web3.eth.getTransactionCount(this._config.get('ACCOUNT_ADDRESS'), 'latest'),
            data
          };
          const signedTx = await web3.eth.accounts.signTransaction(transaction, this._config.get('ACCOUNT_PRIVATE_KEY'));
          web3.eth.sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
            if (!error) {
              console.log(`🎉 The hash of liquidated transaction is: ${hash}`);
            } else {
              console.log('❗Something went wrong while submitting your transaction:', error);
            }
          })
          .on('receipt', console.log);
        } else {
          const isLiquidated = await contract.methods.isOwnerValidatorsDisabled(ownerAddress).call();
          isLiquidated && this._addressService.update({ ownerAddress, burnRate: null, isLiquidated: true });
        }
      }
    } catch (e) {
      console.log(e);
    }
  }
}
