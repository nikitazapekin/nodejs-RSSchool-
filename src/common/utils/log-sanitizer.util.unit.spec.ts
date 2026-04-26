import { describe, expect, it } from 'vitest';

import { sanitizeForLogging } from './log-sanitizer.util';

describe('sanitizeForLogging', () => {
  it('redacts sensitive keys recursively', () => {
    expect(
      sanitizeForLogging({
        password: 'secret',
        token: 'abc',
        nested: {
          refreshToken: 'refresh',
          keep: 'value',
        },
      }),
    ).toEqual({
      password: '[REDACTED]',
      token: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        keep: 'value',
      },
    });
  });

  it('handles arrays and scalars', () => {
    expect(
      sanitizeForLogging([
        {
          authorization: 'Bearer x',
        },
      ]),
    ).toEqual([
      {
        authorization: '[REDACTED]',
      },
    ]);
    expect(sanitizeForLogging('plain')).toBe('plain');
  });
});
