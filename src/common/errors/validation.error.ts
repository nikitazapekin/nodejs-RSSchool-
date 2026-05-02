import { HttpStatus } from '@nestjs/common';

import { BaseHttpError } from './base-http.error';

export class ValidationError extends BaseHttpError {
  constructor(message = 'Validation failed') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
