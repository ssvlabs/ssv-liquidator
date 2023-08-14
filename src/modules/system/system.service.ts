import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { System } from './system.entity';

export enum SystemType {
  GENERAL_LAST_BLOCK_NUMBER = 'GENERAL_LAST_BLOCK_NUMBER',
  EARNINGS_LAST_BLOCK_NUMBER = 'EARNINGS_LAST_BLOCK_NUMBER',
  MINIMUM_LIQUIDATION_COLLATERAL = 'MINIMUM_LIQUIDATION_COLLATERAL',
  LIQUIDATION_THRESHOLD_PERIOD = 'LIQUIDATION_THRESHOLD_PERIOD',
  // event names
  EVENT_OPERATOR_ADDED = 'OperatorAdded',
  EVENT_OPERATOR_REMOVED = 'OperatorRemoved',
  EVENT_COLLATERAL_UPDATED = 'MinimumLiquidationCollateralUpdated',
  EVENT_LIQUIDATION_THRESHOLD_PERIOD_UPDATED = 'LiquidationThresholdPeriodUpdated',
  EVENT_OPERATOR_FEE_APPROVED = 'OperatorFeeExecuted',
  EVENT_VALIDATOR_ADDED = 'ValidatorAdded',
  EVENT_VALIDATOR_REMOVED = 'ValidatorRemoved',
  EVENT_CLUSTER_LIQUIDATED = 'ClusterLiquidated',
  EVENT_CLUSTER_DEPOSITED = 'ClusterDeposited',
  EVENT_CLUSTER_WITHDRAWN = 'ClusterWithdrawn',
  EVENT_CLUSTER_REACTIVATED = 'ClusterReactivated',
}

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(System) private _systemRepository: Repository<System>,
  ) {}

  async get(type: SystemType): Promise<any> {
    const result = await this._systemRepository.findOne({ where: { type } });
    return result && result.payload ? JSON.parse(result.payload) : null;
  }

  async save(type: SystemType, payload: any): Promise<void> {
    if (await this.get(type)) {
      await this._systemRepository.update(type, {
        payload: JSON.stringify(payload),
      });
    } else {
      await this._systemRepository.save({
        type,
        payload: JSON.stringify(payload),
      });
    }
  }
}
