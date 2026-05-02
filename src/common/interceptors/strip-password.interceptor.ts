import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type PlainObject = Record<string, unknown>;

@Injectable()
export class StripPasswordInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((value) => this.stripPassword(value)));
  }

  private stripPassword(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.stripPassword(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const record = value as PlainObject;

    if (Array.isArray(record.data)) {
      return {
        ...record,
        data: record.data.map((item) => this.stripPassword(item)),
      };
    }

    const { password: _password, ...rest } = record;

    return rest;
  }
}
