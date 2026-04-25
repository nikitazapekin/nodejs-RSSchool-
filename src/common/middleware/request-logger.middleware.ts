import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { AppLogger } from '../logger/app-logger.service';
import { sanitizeForLogging } from '../utils/log-sanitizer.util';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    this.logger.logRequest('Incoming request', {
      method: req.method,
      url: req.originalUrl,
      query: sanitizeForLogging(req.query),
      body: sanitizeForLogging(req.body),
    });

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      this.logger.logRequest('Outgoing response', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTimeMs: durationMs,
      });
    });

    next();
  }
}
