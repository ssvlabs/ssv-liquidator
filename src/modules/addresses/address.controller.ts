import { Controller, Get } from '@nestjs/common';
import { QueueService } from '../../queues/queue.service';
import { Address } from './address.entity';
import { AddressService } from './address.service';

@Controller('addresses')
export class AddressController {
  constructor(private _addressService: AddressService, private _queuesService: QueueService) {}

  @Get()
  async list(): Promise<Address[]> {
    return this._addressService.findAll();
  }
}
