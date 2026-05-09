import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../errors/validation.error';
import { AppLogger } from '../logger/app-logger.service';
import { GlobalExceptionFilter } from './global-exception.filter';

function createHost(response: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  let logger: Pick<AppLogger, 'logError'>;
  let filter: GlobalExceptionFilter;
  let response: {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    logger = {
      logError: vi.fn(),
    };
    filter = new GlobalExceptionFilter(logger as AppLogger);
  });

  it('returns custom error status and message', () => {
    filter.catch(new ValidationError('invalid payload'), createHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'invalid payload',
    });
  });

  it('returns known HttpException response', () => {
    filter.catch(
      new BadRequestException(['field is required']),
      createHost(response),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'field is required',
    });
  });

  it('returns generic 500 for unknown errors', () => {
    filter.catch(new Error('boom'), createHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(logger.logError).toHaveBeenCalled();
  });
});
