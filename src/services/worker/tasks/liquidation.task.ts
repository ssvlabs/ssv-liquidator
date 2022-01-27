import { HttpService, Injectable } from '@nestjs/common';
import { LessThanOrEqual } from 'typeorm';

import { AddressService } from '../../../modules/addresses/address.service';
import { EarningService } from '../../../modules/earnings/earning.service';
import { SystemService, SystemType } from '../../../modules/system/system.service';

import { ConfService } from '../../../shared/services/conf.service';
const Web3 = require('web3');
const InputDataDecoder = require('ethereum-input-data-decoder');

const CONTRACT_ABI = require('../../../shared/abi-ssv-network.json');
const decoder = new InputDataDecoder(CONTRACT_ABI);

@Injectable()
export class LiquidationTask {
  private web3;

  constructor(
    private _config: ConfService,
    private _httpService: HttpService,
    private _addressService: AddressService,
    private _earningService: EarningService,
    private _systemService: SystemService
  ) {
    this.web3 = new Web3(this._config.get('NODE_URL'));
  }

  async getEarnings(): Promise<void> {
    const apiUri = 'https://api-goerli.etherscan.io/api';
    const latestBlock = await this.web3.eth.getBlockNumber();
    const fromBlock = await this._systemService.get(SystemType.EARNINGS_LAST_BLOCK_NUMBER) || 0;

    const liquidatorAddress = this.web3.eth.accounts.privateKeyToAccount(this._config.get('ACCOUNT_PRIVATE_KEY')).address;
    const txsList = await this._httpService.get(`${apiUri}?module=account&action=txlist&address=${liquidatorAddress}&startblock=${fromBlock}&endblock=${latestBlock}&endblock=0&page=1&offset=10000&sort=asc&apikey=${this._config.get('ETHERSCAN_KEY')}`).toPromise();
    const filteredTxs = txsList.data.result
      .filter(item => item.to.toLowerCase() === this._config.get('SSV_NETWORK_ADDRESS').toLowerCase() && item.isError === '0');
    for (const tx of filteredTxs) {
      const { method } = decoder.decodeData(tx.input);
      if (method === 'liquidate') {
        const txReceipt: any = await this._httpService.get(`${apiUri}?module=proxy&action=eth_getTransactionReceipt&txhash=${tx.hash}&apikey=${this._config.get('ETHERSCAN_KEY')}`).toPromise();
        const earnedData = {
          hash: tx.hash,
          liquidatorAddress,
          gasPrice: +tx.gasPrice / 1e18,
          gasUsed: tx.gasUsed,
          earned: null,
          earnedAtBlock: tx.blockNumber,
        };
        if (txReceipt.data) {
          const { logs } = txReceipt.data.result;
          const transferData = logs.find(log => log.address === this._config.get('SSV_TOKEN_ADDRESS').toLowerCase());  
          earnedData.earned = transferData && +this.web3.utils.hexToNumberString(transferData.data) / 1e18;
        }
        this._earningService.update(earnedData);
      }
    }
    await this._systemService.save(SystemType.EARNINGS_LAST_BLOCK_NUMBER, latestBlock);
  }

  async liquidate(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching register validator events...`);
    let gasPrice = +await this.web3.eth.getGasPrice();
    console.log("GAS NETWORK PRICE", gasPrice, this.web3.utils.toWei('10', 'ether'))
    const gas = (await this.web3.eth.getBlock('latest')).gasLimit;
    if (this._config.get('GAS_PRICE') === 'slow') {
      gasPrice -= gasPrice * 0.1;
    } else if (this._config.get('GAS_PRICE') === 'high') {
      gasPrice += gasPrice * 0.2;
    }
    gasPrice = +gasPrice.toFixed(0);
    const contract = new this.web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
    const minimumBlocksBeforeLiquidation = +await this._addressService.minimumBlocksBeforeLiquidation();
    const currentBlockNumber = +await this._addressService.currentBlockNumber();
    const toLiquidateRecords = await this._addressService.findBy({
      where: { liquidateAtBlock: LessThanOrEqual(currentBlockNumber + minimumBlocksBeforeLiquidation) },
      take: this._config.get('LIQUIDATE_BATCH_SIZE'),
    });
    let addressesToLiquidate = [];
    for (const { ownerAddress } of toLiquidateRecords) {
      const liquidatable = await this._addressService.liquidatable(ownerAddress);
      if (liquidatable) {
        addressesToLiquidate.push(ownerAddress);
      } else {
        const isLiquidated = await this._addressService.isLiquidated(ownerAddress);
        isLiquidated && this._addressService.update({ ownerAddress, burnRate: null, isLiquidated: true });
      }
    }
    console.log('LIQUIDATE PARAMS', { gas, gasPrice});
    const data = (await contract.methods.liquidate(addressesToLiquidate)).encodeABI();
    const transaction = {
      to: this._config.get('SSV_NETWORK_ADDRESS'),
      value: 0,
      gas,
      gasPrice,
      nonce: await this.web3.eth.getTransactionCount(this.web3.eth.accounts.privateKeyToAccount(this._config.get('ACCOUNT_PRIVATE_KEY')).address, 'latest'),
      data
    };
    const signedTx = await this.web3.eth.accounts.signTransaction(transaction, this._config.get('ACCOUNT_PRIVATE_KEY'));
    this.web3.eth.sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
      if (!error) {
        console.log(`🎉 The hash of liquidated transaction is: ${hash}`);
      } else {
        console.log('❗Something went wrong while submitting your transaction:', error);
      }
    })
    .on('receipt', (data) => {
      // gasPrice * data.gasUsed
      console.log(data);
    });
  }
}
