import { ValidatorCron } from './cron/validators.cron';
import { BurnRateCron } from './cron/burn-rates.cron';
import { LiquidateCron } from './cron/liquidate.cron';

export default [ValidatorCron, BurnRateCron, LiquidateCron];
