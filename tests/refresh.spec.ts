import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { UserRole } from '../src/common/enums/user-role.enum';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function createAuthService() {
  const config = {
    JWT_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d',
  };

  const state = {
    user: null as null | {
      id: string;
      login: string;
      password: string;
      refreshTokenHash: string | null;
      role: UserRole;
      createdAt: Date;
      updatedAt: Date;
    },
  };

  const prisma = {
    user: {
      findUnique: async ({ where }: any) => {
        if (!state.user) {
          return null;
        }

        if (where.id && state.user.id === where.id) {
          return state.user;
        }

        if (where.login && state.user.login === where.login) {
          return state.user;
        }

        return null;
      },
      create: async ({ data }: any) => {
        state.user = {
          id: USER_ID,
          login: data.login,
          password: data.password,
          refreshTokenHash: null,
          role: data.role,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        return state.user;
      },
      update: async ({ where, data }: any) => {
        if (!state.user || state.user.id !== where.id) {
          throw new Error('User not found in test state');
        }

        state.user = {
          ...state.user,
          ...data,
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        };

        return state.user;
      },
    },
  } as any;

  const configService = {
    get: (key: keyof typeof config) => config[key],
  } as any;

  return {
    service: new AuthService(prisma, configService),
    state,
  };
}

describe('Auth refresh flow', () => {
  it('issues a new token pair for a valid refresh token', async () => {
    const { service } = createAuthService();

    await service.signup({
      login: 'viewer01',
      password: 'secret123',
    });

    const firstPair = await service.login({
      login: 'viewer01',
      password: 'secret123',
    });
    const nextPair = await service.refresh(firstPair.refreshToken);

    assert.equal(typeof nextPair.accessToken, 'string');
    assert.equal(typeof nextPair.refreshToken, 'string');
    assert.notEqual(nextPair.accessToken, firstPair.accessToken);
    assert.notEqual(nextPair.refreshToken, firstPair.refreshToken);
  });

  it('rejects refresh when refreshToken is missing', async () => {
    const { service } = createAuthService();

    await assert.rejects(service.refresh(undefined), UnauthorizedException);
  });

  it('rejects refresh when refresh token is invalid', async () => {
    const { service } = createAuthService();

    await service.signup({
      login: 'viewer01',
      password: 'secret123',
    });

    await assert.rejects(service.refresh('invalid-token'), ForbiddenException);
  });

  it('invalidates the refresh token on logout', async () => {
    const { service } = createAuthService();

    await service.signup({
      login: 'viewer01',
      password: 'secret123',
    });

    const pair = await service.login({
      login: 'viewer01',
      password: 'secret123',
    });

    const result = await service.logout(pair.refreshToken);

    assert.deepEqual(result, { message: 'Logged out successfully' });
    await assert.rejects(service.refresh(pair.refreshToken), ForbiddenException);
  });
});
