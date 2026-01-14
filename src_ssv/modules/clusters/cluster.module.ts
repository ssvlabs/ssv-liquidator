import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClusterService } from './cluster.service';
import { Cluster } from './cluster.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cluster])],
  exports: [ClusterService],
  providers: [ClusterService],
})
export class ClusterModule {}
