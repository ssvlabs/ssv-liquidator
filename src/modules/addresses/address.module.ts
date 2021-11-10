import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueueModule } from '../../queues/queue.module';
// import { AddressView } from './cli/address.view';
import { AddressService } from './address.service';
import { Address } from './address.entity';
import { AddressUsedOperators } from './address-used-operators.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Address, AddressUsedOperators]),
    QueueModule,
  ],
  exports: [AddressService],
  providers: [AddressService],
})
export class AddressModule {}
