import Web3Provider from '@cli/providers/web3.provider';

import { Injectable } from '@nestjs/common';
import { LessThanOrEqual } from 'typeorm';

import { AddressService } from '../../../modules/addresses/address.service';

import { ConfService } from '../../../shared/services/conf.service';

@Injectable()
export class LiquidationTask {
  constructor(
    private _config: ConfService,
    private _addressService: AddressService,
  ) {}

  async liquidate(): Promise<void> {
    let gasPrice = +(await Web3Provider.web3.eth.getGasPrice());
    console.log(
      'GAS NETWORK PRICE',
      gasPrice,
      Web3Provider.web3.utils.toWei('10', 'ether'),
    );

    const gas = (await Web3Provider.web3.eth.getBlock('latest')).gasLimit;
    if (this._config.get('GAS_PRICE') === 'slow') {
      gasPrice -= gasPrice * 0.1;
    } else if (this._config.get('GAS_PRICE') === 'high') {
      gasPrice += gasPrice * 0.2;
    }

    gasPrice = +gasPrice.toFixed(0);
    const minimumBlocksBeforeLiquidation =
      +(await Web3Provider.minimumBlocksBeforeLiquidation());
    const currentBlockNumber = +(await Web3Provider.currentBlockNumber());
    const toLiquidateRecords = await this._addressService.findBy({
      where: {
        liquidateAtBlock: LessThanOrEqual(
          currentBlockNumber + minimumBlocksBeforeLiquidation,
        ),
      },
    });
    const addressesToLiquidate = [];
    for (const { ownerAddress } of toLiquidateRecords) {
      const liquidatable = await Web3Provider.liquidatable(ownerAddress);
      if (liquidatable) {
        addressesToLiquidate.push(ownerAddress);
      } else {
        const isLiquidated = await Web3Provider.isLiquidated(ownerAddress);
        if (isLiquidated) {
          await this._addressService.update(
            { ownerAddress },
            { burnRate: null, isLiquidated: true },
          );
        }
      }
    }
    if (addressesToLiquidate.length === 0) {
      // nothing to liquidate
      return;
    }

    console.log('TO LIQUIDATE', addressesToLiquidate);
    console.log('LIQUIDATE PARAMS', { gas, gasPrice });

    const contract = new Web3Provider.web3.eth.Contract(
      Web3Provider.abi,
      this._config.get('SSV_NETWORK_ADDRESS'),
    );

    const data = (
      await contract.methods.liquidate(addressesToLiquidate)
    ).encodeABI();

    const transaction = {
      to: this._config.get('SSV_NETWORK_ADDRESS'),
      value: 0,
      gas,
      gasPrice,
      nonce: await Web3Provider.web3.eth.getTransactionCount(
        Web3Provider.web3.eth.accounts.privateKeyToAccount(
          this._config.get('ACCOUNT_PRIVATE_KEY'),
        ).address,
        'latest',
      ),
      data,
    };

    const signedTx = await Web3Provider.web3.eth.accounts.signTransaction(
      transaction,
      this._config.get('ACCOUNT_PRIVATE_KEY'),
    );

    Web3Provider.web3.eth
      .sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
        if (!error) {
          console.log(`🎉 The hash of liquidated transaction is: ${hash}`);
        } else {
          console.log(
            '❗Something went wrong while submitting your transaction:',
            error,
          );
        }
      })
      .on('receipt', data => {
        // gasPrice * data.gasUsed
        console.log(data);
      });
  }
}
