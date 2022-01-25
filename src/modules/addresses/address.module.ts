import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AddressService } from './address.service';
import { Address } from './address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Address]),
  ],
  exports: [AddressService],
  providers: [AddressService],
})
export class AddressModule {}
