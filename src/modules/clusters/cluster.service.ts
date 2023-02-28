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
    return await this._clusterRepository.find();
  }

  async findBy(options: any): Promise<Cluster[]> {
    return await this._clusterRepository.find(options);
  }

  async get(filters: any): Promise<Cluster> {
    return await this._clusterRepository.findOne(filters);
  }

  async create(clusters: Cluster[]): Promise<void> {
    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Cluster)
      .values(clusters)
      .orIgnore(true)
      .execute();
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
