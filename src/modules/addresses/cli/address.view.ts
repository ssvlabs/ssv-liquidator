import chalk from 'chalk';

import { Get, Injectable } from '@nestjs/common';
import { Address } from '../address.entity';
import { AddressService } from '../address.service';

const Table = require('cli-table');
const table = new Table({ head: ['owner adress', 'burn rate ', 'liquidateAtBlock'] });

@Injectable()
export class AddressView {
  constructor(private _addressService: AddressService) {}

  @Get()
  async list(): Promise<void> {
    const addresses = await this._addressService.findAll();
    addresses.forEach(row => {
      table.push([row.ownerAddress, row.burnRate / 1e18, chalk.black.bgGreen(row.liquidateAtBlock)]);
    });
    console.log(table.toString());
  }
}
