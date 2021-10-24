import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export class ConfService extends ConfigService {
  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }

  get redisOptions(): RedisOptions {
    return {
      host: this.get('REDIS_HOST'),
      port: this.getNumber('REDIS_PORT'),
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };
  }
}
