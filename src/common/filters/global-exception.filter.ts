import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { STATUS_CODES } from 'node:http';

import { BaseHttpError } from '../errors/base-http.error';
import { AppLogger } from '../logger/app-logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const statusCode = this.resolveStatusCode(exception);
    const message = this.resolveMessage(exception, statusCode);
    const error = STATUS_CODES[statusCode] ?? 'Internal Server Error';

    this.logger.logError(
      `Request failed with status ${statusCode}: ${message}`,
      exception,
    );

    response.status(statusCode).json({
      statusCode,
      error,
      message,
    });
  }

  private resolveStatusCode(exception: unknown): number {
    if (exception instanceof BaseHttpError) {
      return exception.statusCode;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exception: unknown, statusCode: number): string {
    if (exception instanceof BaseHttpError) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (
        response &&
        typeof response === 'object' &&
        'message' in response &&
        typeof response.message === 'string'
      ) {
        return response.message;
      }

      if (
        response &&
        typeof response === 'object' &&
        'message' in response &&
        Array.isArray(response.message)
      ) {
        return response.message.join(', ');
      }
    }

    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'An unexpected error occurred';
    }

    return exception instanceof Error ? exception.message : 'Request failed';
  }
}
