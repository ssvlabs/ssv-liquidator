import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfService } from './services/conf.service';
import { CustomLogger } from '@cli/shared/services/logger.service';
import { LoggingInterceptor } from '@cli/shared/services/logging.interceptor';
import { Web3Provider } from '@cli/shared/services/web3.provider';

const providers = [ConfService, CustomLogger, LoggingInterceptor, Web3Provider];

@Global()
@Module({
  providers,
  imports: [HttpModule],
  exports: [...providers, HttpModule],
})
export class SharedModule {}
