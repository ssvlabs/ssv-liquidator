import { tap } from 'rxjs';
import { ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { CustomLogger } from '@cli/shared/services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private customLogger: CustomLogger) {}
  intercept(context: ExecutionContext, next) {
    const now = Date.now();
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        this.customLogger.log(
          `${req.ip} ${new Date()} ${method} ${url} ${req.protocol} ${
            res.statusCode
          } ${req.headers['content-length'] || '0'} ${
            req.headers.host.split(':')[1]
          } ${delay}ms`,
        );
      }),
    );
  }
}
