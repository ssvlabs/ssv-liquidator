export const QueuesEnum = {
  VALIDATORS: 'validators',
  BURN_RATES: 'burn-rates',
  LIQUIDATION: 'liquidation',
};

export const TasksQueuesEnum = {
  FETCH_NEW_VALIDATORS: { name: 'fetch-new-validators', queue: QueuesEnum.VALIDATORS },
  FETCH_UPDATED_VALIDATORS: { name: 'fetch-updated-validators', queue: QueuesEnum.VALIDATORS },
  SYNC_BURN_RATES: { name: 'sync-burn-rates', queue: QueuesEnum.BURN_RATES },
  SYNC_LIQUIDATED_ADDRESSES: { name: 'sync-liquidated-addresses', queue: QueuesEnum.BURN_RATES },
  SYNC_DEPOSITS: { name: 'sync-deposits', queue: QueuesEnum.BURN_RATES },
  SYNC_WITHDRAWS: { name: 'sync-withdraws', queue: QueuesEnum.BURN_RATES },
  LIQUIDATE: { name: 'liquidate', queue: QueuesEnum.LIQUIDATION },
};
