import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueueModule } from '../../queues/queue.module';
// import { AddressView } from './cli/address.view';
import { AddressService } from './address.service';
import { Address } from './address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Address]),
    QueueModule,
  ],
  exports: [AddressService],
  providers: [AddressService],
})
export class AddressModule {}
