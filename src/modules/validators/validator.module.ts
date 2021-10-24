import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { QueueModule } from '../../queues/queue.module';
import { ValidatorController } from './validator.controller';
import { ValidatorService } from './validator.service';
import { Validator, ValidatorSchema } from './schema/validator.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Validator.name, schema: ValidatorSchema },
    ]),
    QueueModule,
  ],
  controllers: [ValidatorController],
  exports: [ValidatorService],
  providers: [ValidatorService],
})
export class ValidatorModule {}
