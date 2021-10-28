import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueueModule } from '../../queues/queue.module';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { Address } from './address.entity';
import { AddressUsedOperators } from './address-used-operators.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Address, AddressUsedOperators]),
    QueueModule,
  ],
  controllers: [AddressController],
  exports: [AddressService],
  providers: [AddressService],
})
export class AddressModule {}
