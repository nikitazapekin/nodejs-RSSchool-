import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { AuthenticatedRequest } from '../types/authenticated-request.type';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private static readonly WINDOW_MS = 60_000;
  private static readonly LIMIT = 5;
  private static readonly store = new Map<string, RateLimitEntry>();

  use(request: AuthenticatedRequest, _response: Response, next: NextFunction): void {
    const now = Date.now();
    const key = `${request.ip}:${request.path}`;
    const current = AuthRateLimitMiddleware.store.get(key);

    if (!current || current.resetAt <= now) {
      AuthRateLimitMiddleware.store.set(key, {
        count: 1,
        resetAt: now + AuthRateLimitMiddleware.WINDOW_MS,
      });
      next();
      return;
    }

    if (current.count >= AuthRateLimitMiddleware.LIMIT) {
      throw new HttpException(
        'Too many authentication attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    AuthRateLimitMiddleware.store.set(key, current);
    next();
  }
}
