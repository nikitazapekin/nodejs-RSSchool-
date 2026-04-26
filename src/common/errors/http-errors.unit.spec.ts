import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { BaseHttpError } from './base-http.error';
import { ForbiddenError } from './forbidden.error';
import { NotFoundError } from './not-found.error';
import { UnauthorizedError } from './unauthorized.error';
import { ValidationError } from './validation.error';

describe('custom http errors', () => {
  it('creates a base error with message and status', () => {
    const error = new BaseHttpError('boom', HttpStatus.BAD_REQUEST);

    expect(error.message).toBe('boom');
    expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(error).toBeInstanceOf(Error);
  });

  it('creates not found error', () => {
    const error = new NotFoundError('missing');

    expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(error.message).toBe('missing!');
  });

  it('creates validation error', () => {
    const error = new ValidationError('invalid');

    expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(error.message).toBe('invalid');
  });

  it('creates unauthorized error', () => {
    const error = new UnauthorizedError('login required');

    expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(error.message).toBe('login required');
  });

  it('creates forbidden error', () => {
    const error = new ForbiddenError('blocked');

    expect(error.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(error.message).toBe('blocked');
  });
});
