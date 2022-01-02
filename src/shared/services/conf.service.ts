import { ConfigService } from '@nestjs/config';

export class ConfService extends ConfigService {
  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }
}
