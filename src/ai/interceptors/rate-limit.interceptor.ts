import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { AppLogger } from '../../common/logger/app-logger.service';

interface RequestLog {
  count: number;
  resetAt: number;
}

@Injectable()
export class AiRateLimitInterceptor implements NestInterceptor {
  private requests = new Map<string, RequestLog>();
  private readonly rpm: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.rpm = Number(this.configService.get<string>('AI_RATE_LIMIT_RPM') ?? '20');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ ip: string }>();
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void }>();
    const ip = request.ip ?? 'unknown';
    const now = Date.now();
    const windowMs = 60000;

    let log = this.requests.get(ip);
    if (!log || now > log.resetAt) {
      log = { count: 0, resetAt: now + windowMs };
    }

    log.count++;
    this.requests.set(ip, log);

    if (log.count > this.rpm) {
      const retryAfter = Math.ceil((log.resetAt - now) / 1000);
      response.setHeader('Retry-After', String(retryAfter));
      this.logger.warn(`AI rate limit exceeded: ${ip}, count: ${log.count}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
