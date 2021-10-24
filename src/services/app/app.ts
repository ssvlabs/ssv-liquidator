import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import RateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { ConfService } from '../../shared/services/conf.service';
import { setupSwagger } from '../../viveo-swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    cors: true,
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  app.enable('trust proxy'); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  app.use(helmet());
  app.use(
    RateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );
  app.use(compression());
  app.use(morgan('combined'));

  const reflector = app.get(Reflector);

  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      dismissDefaultMessages: true,
      validationError: {
        target: false,
      },
    }),
  );

  const configService = app.get(ConfService);
  console.log('mongo string:', configService.get('MONGO_DB'));

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      port: configService.get<number>('TRANSPORT_PORT'),
      retryAttempts: 5,
      retryDelay: 3000,
    },
  });

  await app.startAllMicroservicesAsync();

  if (['development', 'staging'].includes(configService.nodeEnv)) {
    setupSwagger(app);
  }

  const port = configService.getNumber('PORT');

  await app.listen(port);

  // eslint-disable-next-line no-console
  console.info(`server running on port ${port}`);
}

void bootstrap();
