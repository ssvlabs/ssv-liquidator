import { LessThanOrEqual } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BackOffPolicy, Retryable } from 'typescript-retry-decorator';
import Web3Provider from '@cli/providers/web3.provider';
import { ConfService } from '@cli/shared/services/conf.service';
import { AddressService } from '@cli/modules/addresses/address.service';
import {
  liquidationStatus,
  criticalStatus,
} from '@cli/modules/webapp/metrics/services/metrics.service';

@Injectable()
export class LiquidationTask {
  constructor(
    private _config: ConfService,
    private _addressService: AddressService,
  ) {}

  @Retryable({
    maxAttempts: 100,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    doRetry: (e: Error) => {
      console.error(
        '[CRITICAL] Error running LiquidationTask :: liquidate: ',
        e,
      );
      liquidationStatus.set(0);
      criticalStatus.set(0);
      return true;
    },
    exponentialOption: {
      maxInterval: 1000 * 60,
      multiplier: 2,
    },
  })
  async liquidate(): Promise<void> {
    const minimumBlocksBeforeLiquidation =
      +(await Web3Provider.minimumBlocksBeforeLiquidation());
    const currentBlockNumber = +(await Web3Provider.currentBlockNumber());
    const toLiquidateRecords = await this._addressService.findBy({
      where: {
        liquidateLastBlock: LessThanOrEqual(
          currentBlockNumber + minimumBlocksBeforeLiquidation,
        ),
      },
    });
    const addressesToLiquidate = [];
    for (const { ownerAddress } of toLiquidateRecords) {
      try {
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
        liquidationStatus.set(1);
      } catch (e) {
        console.error(
          `Address ${ownerAddress} not possible to liquidate. Error: ${
            e.message || e
          }`,
        );
        liquidationStatus.set(0);
      }
    }
    if (addressesToLiquidate.length === 0) {
      // nothing to liquidate
      liquidationStatus.set(1);
      criticalStatus.set(1);
      return;
    }

    const contract = new Web3Provider.web3.eth.Contract(
      Web3Provider.abi,
      this._config.get('SSV_NETWORK_ADDRESS'),
    );

    console.log(`Going to liquidate owner address: ${addressesToLiquidate}`);

    const data = (
      await contract.methods.liquidate(addressesToLiquidate)
    ).encodeABI();

    const transaction: any = {
      to: this._config.get('SSV_NETWORK_ADDRESS'),
      value: 0,
      nonce: await Web3Provider.web3.eth.getTransactionCount(
        Web3Provider.web3.eth.accounts.privateKeyToAccount(
          this._config.get('ACCOUNT_PRIVATE_KEY'),
        ).address,
        'pending',
      ),
      data,
    };

    const gas =
      (await Web3Provider.web3.eth.estimateGas({
        ...transaction,
        from: Web3Provider.web3.eth.accounts.privateKeyToAccount(
          this._config.get('ACCOUNT_PRIVATE_KEY'),
        ).address,
      })) * 1.2;

    transaction.gas = +gas.toFixed(0);

    let gasPrice = +(await Web3Provider.web3.eth.getGasPrice());
    if (this._config.get('GAS_PRICE') === 'low') {
      gasPrice -= gasPrice * 0.1;
    } else if (this._config.get('GAS_PRICE') === 'medium') {
      gasPrice += gasPrice * 0.2;
    } else if (this._config.get('GAS_PRICE') === 'high') {
      gasPrice += gasPrice * 0.4;
    }

    transaction.gasPrice = +gasPrice.toFixed(0);

    console.log(`Liquidate transaction payload to be send: ${transaction}`);

    const signedTx = await Web3Provider.web3.eth.accounts.signTransaction(
      transaction,
      this._config.get('ACCOUNT_PRIVATE_KEY'),
    );

    Web3Provider.web3.eth
      .sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
        if (!error) {
          console.log(`🎉 The hash of liquidated transaction is: ${hash}`);
          liquidationStatus.set(1);
        } else {
          console.error(
            `[CRITICAL] Something went wrong while submitting your transaction: ${
              error.message || error
            }`,
          );
          liquidationStatus.set(0);
          criticalStatus.set(0);
        }
      })
      .on('receipt', data => {
        // gasPrice * data.gasUsed
        console.log(`Transaction receipt: ${JSON.stringify(data)}`);
        liquidationStatus.set(1);
        criticalStatus.set(1);
      });
  }
}
