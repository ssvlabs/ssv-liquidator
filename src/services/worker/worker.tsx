import { NestFactory } from '@nestjs/core';

import { ConfService } from '../../shared/services/conf.service';
import { AddressService } from '../../modules/addresses/address.service';

import { WorkerModule } from './worker.module';

import React from 'react';
import { render } from 'ink';
import importJsx from 'import-jsx';
import path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule, { logger: ['error', 'warn'], });
  const configService = app.select(WorkerModule).get(ConfService);
  const addressService = app.select(WorkerModule).get(AddressService);

  const { App } = importJsx(path.join(__dirname,'/../../shared/cli/app'));
  render(<App resource='addresses' service={addressService} />);

  const port = configService.getNumber('WORKER_PORT');
  await app
    .listen(port)
    // eslint-disable-next-line no-console
    .then(() => console.log()); // `Worker running on port ${port}`
}

void bootstrap();
