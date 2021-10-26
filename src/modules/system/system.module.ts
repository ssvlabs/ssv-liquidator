import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SystemService } from './system.service';
import { System } from './system.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([System]),
  ],
  controllers: [],
  exports: [SystemService],
  providers: [SystemService],
})
export class SystemModule {}
