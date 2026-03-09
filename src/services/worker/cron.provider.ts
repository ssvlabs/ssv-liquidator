import { BurnRateCron } from './cron/burn-rates.cron';
import { FetchCron } from './cron/fetch.cron';
import { LiquidationCron } from './cron/liquidation.cron';
import { VerifyThresholdCron } from './cron/verify-threshold.cron';

export default [BurnRateCron, FetchCron, LiquidationCron, VerifyThresholdCron];
