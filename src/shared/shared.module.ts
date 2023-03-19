import { Global, HttpModule, Module } from '@nestjs/common';
import { ConfService } from './services/conf.service';
import { SolidityErrorsService } from '@cli/shared/services/solidity-errors.service';

const providers = [ConfService, SolidityErrorsService];

@Global()
@Module({
  providers,
  imports: [HttpModule],
  exports: [...providers, HttpModule],
})
export class SharedModule {}
