import '../../boilerplate.polyfill';

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { contextMiddleware } from '../../middlewares';
import { ValidatorModule } from '../../modules/validators/validator.module';
import { HealthModule } from '../../modules/health/health.module';
import { ConfService } from '../../shared/services/conf.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db',
      synchronize: true,
      logging: false,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
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