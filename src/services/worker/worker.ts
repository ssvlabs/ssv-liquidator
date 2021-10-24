import { NestFactory } from '@nestjs/core';

import { ConfService } from '../../shared/services/conf.service';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule, { logger: ['error', 'warn'], });
  const configService = app.select(WorkerModule).get(ConfService);
  const port = configService.getNumber('WORKER_PORT');
  await app
    .listen(port)
    // eslint-disable-next-line no-console
    .then(() => console.log(`Worker running on port ${port}`));
}

void bootstrap();
