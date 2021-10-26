import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueueModule } from '../../queues/queue.module';
import { ValidatorController } from './validator.controller';
import { ValidatorService } from './validator.service';
import { Validator } from './validator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Validator]),
    QueueModule,
  ],
  controllers: [ValidatorController],
  exports: [ValidatorService],
  providers: [ValidatorService],
})
export class ValidatorModule {}
