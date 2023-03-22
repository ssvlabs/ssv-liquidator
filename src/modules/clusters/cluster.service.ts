import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';

import { Cluster } from './cluster.entity';

@Injectable()
export class ClusterService {
  constructor(
    @InjectRepository(Cluster) private _clusterRepository: Repository<Cluster>,
  ) {}

  async findAll(): Promise<Cluster[]> {
    return this._clusterRepository.find({
      order: {
        liquidationBlockNumber: 'ASC',
      },
    });
  }

  async findBy(options: any): Promise<Cluster[]> {
    return this._clusterRepository.find(options);
  }

  async create(cluster: Cluster): Promise<void> {
    const records = await this.findBy({
      where: {
        owner: cluster.owner,
        operatorIds: cluster.operatorIds,
      },
    });

    if (records.length > 0) {
      return this.update(
        {
          owner: cluster.owner,
          operatorIds: cluster.operatorIds,
        },
        cluster,
      );
    }
    await this._clusterRepository.insert(cluster);
  }

  async update(where: any, updates: any): Promise<void> {
    const records = await this.findBy({ where });
    for (const record of records) {
      await this._clusterRepository.save({
        ...record,
        ...updates,
        updatedAt: new Date(),
      });
    }
  }

  async remove(where: any): Promise<any> {
    return this._clusterRepository.delete(where);
  }
}
