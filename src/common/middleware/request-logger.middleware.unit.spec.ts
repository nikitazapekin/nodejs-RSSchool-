import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import { AppLogger } from '../logger/app-logger.service';
import { RequestLoggerMiddleware } from './request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  it('logs incoming requests and outgoing responses with sanitized data', () => {
    const logger = {
      logRequest: vi.fn(),
    } as unknown as AppLogger;
    const middleware = new RequestLoggerMiddleware(logger);
    const response = new EventEmitter() as EventEmitter & { statusCode: number };
    response.statusCode = 201;

    middleware.use(
      {
        method: 'POST',
        originalUrl: '/auth/login',
        query: { page: '1' },
        body: {
          login: 'user01',
          password: 'secret',
          refreshToken: 'token',
        },
      } as never,
      response as never,
      vi.fn(),
    );

    expect(logger.logRequest).toHaveBeenNthCalledWith(1, 'Incoming request', {
      method: 'POST',
      url: '/auth/login',
      query: { page: '1' },
      body: {
        login: 'user01',
        password: '[REDACTED]',
        refreshToken: '[REDACTED]',
      },
    });

    response.emit('finish');

    expect(logger.logRequest).toHaveBeenNthCalledWith(
      2,
      'Outgoing response',
      expect.objectContaining({
        method: 'POST',
        url: '/auth/login',
        statusCode: 201,
      }),
    );
  });
});
