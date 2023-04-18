import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, FindManyOptions } from 'typeorm';
import { Cluster } from '@cli/modules/clusters/cluster.entity';

@Injectable()
export class ClusterService {
  constructor(
    @InjectRepository(Cluster) private _clusterRepository: Repository<Cluster>,
  ) {}

  async findAll(): Promise<Cluster[]> {
    return this._clusterRepository.find({
      where: [{ burnRate: MoreThan(0) }, { isLiquidated: true }],
      order: {
        liquidationBlockNumber: 'ASC',
      },
    });
  }

  async findBy(options: FindManyOptions): Promise<Cluster[]> {
    return this._clusterRepository.find(options);
  }

  async create(cluster: Cluster): Promise<any> {
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
    return this._clusterRepository.insert(cluster);
  }

  /**
   * Returns true if any entry has been saved in database.
   * @param where
   * @param updates
   */
  async update(where: any, updates: any): Promise<boolean> {
    const records = await this.findBy({ where });
    let updated = false;
    for (const record of records) {
      for (const record of records) {
        const dto: any = this._clusterRepository.create(updates);
        updated =
          updated || !!(await this._clusterRepository.update(where, dto));
      }
    }
    return updated;
  }

  async remove(where: any): Promise<any> {
    return this._clusterRepository.delete(where);
  }
}
