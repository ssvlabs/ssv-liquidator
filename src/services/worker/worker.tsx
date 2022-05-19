import importJsx from 'import-jsx';
import React from 'react';
import path from 'path';

import Web3Provider from '@cli/providers/web3.provider';

import { render } from 'ink';
import { NestFactory } from '@nestjs/core';

import { AddressService } from '@cli/modules/addresses/address.service';
import { EarningService } from '@cli/modules/earnings/earning.service';

import { WorkerModule } from './worker.module';


async function bootstrap() {
  // const app = await NestFactory.create(WorkerModule, { logger: ['error', 'warn'], });

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn'],
  });
  const addressService = app.select(WorkerModule).get(AddressService);
  const earningService = app.select(WorkerModule).get(EarningService);

  const { App } = importJsx(path.join(__dirname, '/../../shared/cli/app'));
  render(
    <App
      addressService={addressService}
      web3Provider={Web3Provider}
      earningService={earningService}
    />,
  );
}

void bootstrap();
