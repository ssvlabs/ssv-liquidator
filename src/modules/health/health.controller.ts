import { Controller, Get } from '@nestjs/common';
import {
  HttpHealthIndicator,
  HealthCheck,
  HealthCheckService,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private _health: HealthCheckService,
    private _http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    // eslint-disable-next-line no-console
    return this._health.check([
      () => this._http.pingCheck('google.com', 'https://google.com'),
    ]);
  }
}
