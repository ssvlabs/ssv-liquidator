import { BurnRateCron } from './cron/burn-rates.cron';
import { FetchCron } from './cron/fetch.cron';
import { LiquidationCron } from './cron/liquidation.cron';

export default [BurnRateCron, FetchCron, LiquidationCron];
