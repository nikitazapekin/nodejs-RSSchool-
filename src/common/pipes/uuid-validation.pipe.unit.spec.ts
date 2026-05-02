import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { UuidValidationPipe } from './uuid-validation.pipe';

describe('UuidValidationPipe', () => {
  const pipe = new UuidValidationPipe();
  const metadata: ArgumentMetadata = { type: 'param', data: 'id', metatype: String };

  it('passes through a valid UUID v4', async () => {
    await expect(
      pipe.transform('11111111-1111-4111-8111-111111111111', metadata),
    ).resolves.toBe('11111111-1111-4111-8111-111111111111');
  });

  it('throws BadRequestException for malformed UUID', async () => {
    await expect(pipe.transform('not-a-uuid', metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
