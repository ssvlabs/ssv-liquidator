import '../../boilerplate.polyfill';

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { contextMiddleware } from '../../middlewares';
import { ValidatorModule } from '../../modules/validators/validator.module';
import { HealthModule } from '../../modules/health/health.module';
import { ConfService } from '../../shared/services/conf.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfService) => ({
        uri: configService.get('MONGO_DB'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      }),
      inject: [ConfService],
    }),
    SharedModule,
    ScheduleModule.forRoot(),
    ValidatorModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {
    consumer.apply(contextMiddleware).forRoutes('*');
  }
}
