import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Not, LessThanOrEqual } from 'typeorm';
import Web3Provider from '@cli/providers/web3.provider';

import { Cluster } from '@cli/modules/clusters/cluster.entity';
import { ConfService } from '@cli/shared/services/conf.service';
import { RetryService } from '@cli/shared/services/retry.service';

@Injectable()
export class ClusterService {
  constructor(
    @InjectRepository(Cluster) private _clusterRepository: Repository<Cluster>,
    private _config: ConfService,
    private _retryService: RetryService,
  ) {}

  getQueryBuilder() {
    return this._clusterRepository.createQueryBuilder('cluster');
  }

  async findAll(): Promise<Cluster[]> {
    return this._clusterRepository.find({
      order: {
        liquidationBlockNumber: 'ASC',
      },
    });
  }

  async findBy(options: FindManyOptions): Promise<Cluster[]> {
    return this._clusterRepository.find(options);
  }

  async countActive(): Promise<number> {
    return this._clusterRepository.count({
      where: {
        isLiquidated: false,
        burnRate: Not(0),
      },
    });
  }

  async countLiquidatable(): Promise<any> {
    const currentBlockNumber = +(await this._retryService.getWithRetry(
      Web3Provider.currentBlockNumber,
    ));

    const toLiquidate = await this.findBy({
      where: {
        isLiquidated: false,
        burnRate: Not(0),
        liquidationBlockNumber: LessThanOrEqual(currentBlockNumber),
      },
    });

    return toLiquidate.reduce(
      (aggr, cluster) => {
        const blockNumberWhen0 =
          currentBlockNumber + cluster.balance / cluster.burnRate;
        const diffBlocks = cluster.liquidationBlockNumber - blockNumberWhen0;
        if (currentBlockNumber >= blockNumberWhen0 + diffBlocks * 0.01) {
          aggr.burnt99 += 1;
        } else if (currentBlockNumber >= blockNumberWhen0 + diffBlocks * 0.1) {
          aggr.burnt90 += 1;
        } else if (currentBlockNumber >= blockNumberWhen0 + diffBlocks * 0.5) {
          aggr.burnt50 += 1;
        } else if (currentBlockNumber >= blockNumberWhen0 + diffBlocks * 0.9) {
          aggr.burnt10 += 1;
        }
        return aggr;
      },
      {
        total: toLiquidate.length,
        burnt10: 0,
        burnt50: 0,
        burnt90: 0,
        burnt99: 0,
      },
    );
  }

  async toDisplay(): Promise<Cluster[]> {
    const currentBlockNumber = +(await this._retryService.getWithRetry(
      Web3Provider.currentBlockNumber,
    ));
    return this.findBy({
      where: {
        isLiquidated: false,
        burnRate: Not(0),
        liquidationBlockNumber: LessThanOrEqual(
          currentBlockNumber + +this._config.get('MAX_VISIBLE_BLOCKS'),
        ),
      },
      order: {
        liquidationBlockNumber: 'ASC',
      },
    });
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
      const dto: any = this._clusterRepository.create({
        ...record,
        ...updates,
      });
      updated =
        updated ||
        !!(await this._clusterRepository.update(where, dto)).affected;
    }
    return updated;
  }

  async remove(where: any): Promise<any> {
    return this._clusterRepository.delete(where);
  }
}
