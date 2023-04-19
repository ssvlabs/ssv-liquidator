import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfService } from './services/conf.service';
import { RetryService } from '@cli/shared/services/retry.service';
import { CustomLogger } from '@cli/shared/services/logger.service';
import { LoggingInterceptor } from '@cli/shared/services/logging.interceptor';

const providers = [ConfService, CustomLogger, LoggingInterceptor, RetryService];

@Global()
@Module({
  providers,
  imports: [HttpModule],
  exports: [...providers, HttpModule],
})
export class SharedModule {}
