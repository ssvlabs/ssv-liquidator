import { Injectable } from '@nestjs/common';
import { SystemService, SystemType } from '../../../modules/system/system.service';
import { AddressService } from '../../../modules/addresses/address.service';
import { ConfService } from '../../../shared/services/conf.service';

const Web3 = require('web3');

const CONTRACT_ABI = require('../../../shared/abi-ssv-network.json');
@Injectable()
export class BurnRatesTask {
  constructor(
    private _config: ConfService,
    private _addressService: AddressService,
    private _systemService: SystemService
  ) {}

  async syncBurnRates(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`syncing burn rate updates...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const missedRecords = await this._addressService.findBy({ take: 100, select: ['ownerAddress'] }); // where: { burnRate: null }, 
    const burnRates = await Promise.allSettled(missedRecords.map(({ ownerAddress }) => this._addressService.burnRate(ownerAddress)));
    const balances = await Promise.allSettled(missedRecords.map(({ ownerAddress }) => this._addressService.totalBalanceOf(ownerAddress)));
    const liquidated = await Promise.allSettled(missedRecords.map(({ ownerAddress }) => this._addressService.isLiquidated(ownerAddress)));
    for (const [index, record] of missedRecords.entries()) {
      const burnRate = +(burnRates[index] as any).value;
      const balanceObject = balances[index] as any;
      const balance = balanceObject.status === 'rejected' && balanceObject.reason.toString().includes('negative balance')
        ? 0
        : +balanceObject.value;
      const isLiquidated = (liquidated[index] as any).value;
      record.burnRate = burnRate;
      record.liquidateAtBlock = burnRate > 0
        ? await web3.eth.getBlockNumber() + +(balance / burnRate).toFixed(0)
        : null;
      record.isLiquidated = isLiquidated;
    }
    await Promise.all(missedRecords.map(record => this._addressService.update(record)));
  }

  async syncLiquidatedAddresses(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching liquidated addresses events...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
    const latestBlock = await this._addressService.currentBlockNumber();
    const fromBlock = await this._systemService.get(SystemType.LIQUIDATED_LAST_BLOCK_NUMBER);
    const filters = {
      fromBlock: fromBlock ? fromBlock + 1 : 0,
      toBlock: latestBlock
    };
    console.log(`fetching liquidated addresses...`, filters);
    const events = await contract.getPastEvents('AccountLiquidated', filters);
    const result = events
      .map(row => Object.keys(row.returnValues).reduce((aggr, key) => {
        if (isNaN(key as any)) {
          aggr[key] = row.returnValues[key];
        }
        return aggr;
      }, {}));
    await Promise.all(result.map(item => this._addressService.update({ ownerAddress: item.ownerAddress, burnRate: null })));

    await this._systemService.save(SystemType.LIQUIDATED_LAST_BLOCK_NUMBER, latestBlock);
    console.log(`got ${events.length} events of liquidated addresses...`);
  }

  async syncFundsDeposited(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching deposits events...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
    const latestBlock = await this._addressService.currentBlockNumber();
    const fromBlock = await this._systemService.get(SystemType.DEPOSITED_LAST_BLOCK_NUMBER);
    const filters = {
      fromBlock: fromBlock ? fromBlock + 1 : 0,
      toBlock: latestBlock
    };
    console.log(`fetching deposits...`, filters);
    const events = await contract.getPastEvents('FundsDeposited', filters);
    const result = events
      .map(row => Object.keys(row.returnValues).reduce((aggr, key) => {
        if (isNaN(key as any)) {
          aggr[key] = row.returnValues[key];
        }
        return aggr;
      }, {}));
    await Promise.all(result.map(item => this._addressService.update({ ownerAddress: item.ownerAddress, burnRate: null })));

    await this._systemService.save(SystemType.DEPOSITED_LAST_BLOCK_NUMBER, latestBlock);
    console.log(`got ${events.length} events of deposits...`);
  }

  async syncFundsWithdrawn(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`fetching withdraw events...`);
    const web3 = new Web3(this._config.get('NODE_URL'));
    const contract = new web3.eth.Contract(CONTRACT_ABI, this._config.get('SSV_NETWORK_ADDRESS'));
    const latestBlock = await this._addressService.currentBlockNumber();
    const fromBlock = await this._systemService.get(SystemType.WITHDRAWN_LAST_BLOCK_NUMBER);
    const filters = {
      fromBlock: fromBlock ? fromBlock + 1 : 0,
      toBlock: latestBlock
    };
    console.log(`fetching withdraws...`, filters);
    const events = await contract.getPastEvents('FundsWithdrawn', filters);
    const result = events
      .map(row => Object.keys(row.returnValues).reduce((aggr, key) => {
        if (isNaN(key as any)) {
          aggr[key] = row.returnValues[key];
        }
        return aggr;
      }, {}));
    await Promise.all(result.map(item => this._addressService.update({ ownerAddress: item.ownerAddress, burnRate: null })));

    await this._systemService.save(SystemType.WITHDRAWN_LAST_BLOCK_NUMBER, latestBlock);
    console.log(`got ${events.length} events of withdraws...`);
  }
}
