import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EarningService } from './earning.service';
import { Earning } from './earning.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Earning])],
  exports: [EarningService],
  providers: [EarningService],
})
export class EarningModule {}
