import { ValidatorCron } from './cron/validators.cron';
import { BurnRateCron } from './cron/burn-rates.cron';
import { LiquidationCron } from './cron/liquidation.cron';

export default [ValidatorCron, BurnRateCron, LiquidationCron];
