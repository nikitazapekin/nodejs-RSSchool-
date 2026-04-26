import { HttpStatus } from '@nestjs/common';

import { BaseHttpError } from './base-http.error';

export class NotFoundError extends BaseHttpError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}
