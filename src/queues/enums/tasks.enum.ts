export const QueuesEnum = {
  VALIDATORS: 'validators',
  BURN_RATES: 'burn-rates',
};

export const TasksQueuesEnum = {
  FETCH_VALIDATORS: { name: 'fetch-validators', queue: QueuesEnum.VALIDATORS },
  SYNC_BURN_RATES: { name: 'sync-burn-rates', queue: QueuesEnum.BURN_RATES },
};
