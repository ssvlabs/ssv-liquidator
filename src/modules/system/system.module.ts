import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SystemService } from './system.service';
import { System, SystemSchema } from './schema/system.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: System.name, schema: SystemSchema },
    ]),
  ],
  controllers: [],
  exports: [SystemService],
  providers: [SystemService],
})
export class SystemModule {}
