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
import Web3Provider from '@cli/providers/web3.provider';
import { WebappModule } from '@cli/modules/webapp/webapp.module';
import { ConfService } from '@cli/shared/services/conf.service';
import { WorkerModule } from '@cli/services/worker/worker.module';
import { EarningService } from '@cli/modules/earnings/earning.service';
import { ClusterService } from '@cli/modules/clusters/cluster.service';
import { criticalStatus } from '@cli/modules/webapp/metrics/services/metrics.service';

async function bootstrapWebApp() {
  const app = await NestFactory.create<NestExpressApplication>(
    WebappModule,
    new ExpressAdapter(),
    { cors: true },
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

  const confService = app.select(WebappModule).get(ConfService);
  confService.init();

  const port = confService.getNumber('PORT') || 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.info(`WebApp is running on port: ${port}`);
}

async function bootstrapCli() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn'],
  });

  const confService = app.select(WorkerModule).get(ConfService);
  confService.init();

  const clusterService = app.select(WorkerModule).get(ClusterService);
  const earningService = app.select(WorkerModule).get(EarningService);

  const { App } = importJsx(path.join(__dirname, '/../../shared/cli/app'));
  render(
    <App
      clusterService={clusterService}
      web3Provider={Web3Provider}
      earningService={earningService}
    />,
  );
}

async function bootstrap() {
  process.on('unhandledRejection', error => {
    console.error('[CRITICAL] unhandledRejection', error);
    criticalStatus.set(1);
  });

  console.info('Starting WebApp');
  await bootstrapWebApp();
  console.info('Starting Liquidator worker');
  await bootstrapCli();
}

void bootstrap();
