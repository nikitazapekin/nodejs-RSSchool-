import { HttpStatus } from '@nestjs/common';

import { BaseHttpError } from './base-http.error';

export class UnauthorizedError extends BaseHttpError {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
