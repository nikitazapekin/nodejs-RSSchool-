import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { StripPasswordInterceptor } from './strip-password.interceptor';

describe('StripPasswordInterceptor', () => {
  const interceptor = new StripPasswordInterceptor();
  const context = {} as ExecutionContext;

  it('removes password from a plain object response', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () =>
          of({
            id: 'user-1',
            login: 'viewer01',
            password: 'secret',
            role: 'viewer',
          }),
      } as CallHandler),
    );

    expect(result).toEqual({
      id: 'user-1',
      login: 'viewer01',
      role: 'viewer',
    });
  });

  it('removes password from paginated response items', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () =>
          of({
            total: 1,
            page: 1,
            limit: 10,
            data: [
              {
                id: 'user-1',
                login: 'viewer01',
                password: 'secret',
                role: 'viewer',
              },
            ],
          }),
      } as CallHandler),
    );

    expect(result).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      data: [
        {
          id: 'user-1',
          login: 'viewer01',
          role: 'viewer',
        },
      ],
    });
  });

  it('preserves scalar values and strips arrays of objects', async () => {
    const scalarResult = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of('ok'),
      } as CallHandler),
    );
    const arrayResult = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () =>
          of([
            {
              id: 'user-1',
              password: 'secret',
            },
          ]),
      } as CallHandler),
    );

    expect(scalarResult).toBe('ok');
    expect(arrayResult).toEqual([{ id: 'user-1' }]);
  });
});
