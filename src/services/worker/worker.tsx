import importJsx from 'import-jsx';
import React from 'react';
import path from 'path';
import { render } from 'ink';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { Web3Provider } from '@cli/shared/services/web3.provider';
import { ConfService } from '@cli/shared/services/conf.service';
import { WorkerModule } from '@cli/services/worker/worker.module';
import { CustomLogger } from '@cli/shared/services/logger.service';
import { EarningService } from '@cli/modules/earnings/earning.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { MetricsService } from '@cli/modules/webapp/metrics/services/metrics.service';

const logger = new CustomLogger('App');

async function bootstrapApi() {
  const app = await NestFactory.create<NestExpressApplication>(
    WorkerModule,
    new ExpressAdapter(),
    { cors: true, logger: false },
  );

  app.enable('trust proxy');
  app.enableCors();

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      dismissDefaultMessages: true,
      validationError: {
        target: false,
      },
    }),
  );

  const confService = app.select(WorkerModule).get(ConfService);
  const port = confService.getNumber('PORT') || 3000;
  await app.listen(port);

  app.useLogger(logger);
  logger.log(`WebApp is running on port: ${port}`);
  logger.log(`Node url: ${confService.get('NODE_URL')}`);
  logger.log(`Network: ${confService.get('SSV_SYNC')}`);
  await app.get(Web3Provider).printConfig();
}

async function bootstrapCli() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: false,
    autoFlushLogs: false,
    bufferLogs: false,
  });
  app.useLogger(logger);
  logger.log('Starting Liquidation worker');

  const confService = app.select(WorkerModule).get(ConfService);

  const clusterService = app.select(WorkerModule).get(ClusterService);
  const earningService = app.select(WorkerModule).get(EarningService);
  const web3Provider = app.select(WorkerModule).get(Web3Provider);

  if (confService.get('HIDE_TABLE') === '1') {
    return;
  }

  const { App } = importJsx(path.join(__dirname, '/../../shared/cli/app'));
  render(
    <App
      clusterService={clusterService}
      web3Provider={web3Provider}
      earningService={earningService}
    />,
  );
}

async function bootstrap() {
  logger.log(`Liquidator starting`);
  process.on('unhandledRejection', (error: Error) => {
    logger.error(`[CRITICAL] unhandledRejection ${error} ${error.stack}`);
    MetricsService.criticalStatus.set(0);
  });
  await bootstrapApi();
  await bootstrapCli();
}

void bootstrap();
