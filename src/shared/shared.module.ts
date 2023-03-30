import { Global, HttpModule, Module } from '@nestjs/common';
import { ConfService } from './services/conf.service';

const providers = [ConfService];

@Global()
@Module({
  providers,
  imports: [HttpModule],
  exports: [...providers, HttpModule],
})
export class SharedModule {}
