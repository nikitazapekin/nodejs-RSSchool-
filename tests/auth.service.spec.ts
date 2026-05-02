import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compare } from 'bcryptjs';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';

import { UserRole } from '../src/common/enums/user-role.enum';
import { AuthService } from '../src/auth/auth.service';

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
    config,
  };
}

describe('AuthService', () => {
  it('creates a viewer user and stores a password hash on signup', async () => {
    const { service, state } = createAuthService();

    const result = await service.signup({
      login: 'viewer01',
      password: 'secret123',
    });

    assert.deepEqual(result, { message: 'User created successfully' });
    assert.equal(state.user?.role, UserRole.VIEWER);
    assert.notEqual(state.user?.password, 'secret123');
    assert.equal(await compare('secret123', state.user?.password ?? ''), true);
  });

  it('rejects signup when login is already taken', async () => {
    const { service, state } = createAuthService();

    state.user = {
      id: USER_ID,
      login: 'viewer01',
      password: 'hashed-password',
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    await assert.rejects(
      service.signup({
        login: 'viewer01',
        password: 'secret123',
      }),
      BadRequestException,
    );
  });

  it('returns JWT access and refresh tokens with required payload on login', async () => {
    const { service, state, config } = createAuthService();

    await service.signup({
      login: 'editor01',
      password: 'secret123',
    });

    state.user = {
      ...(state.user as NonNullable<typeof state.user>),
      role: UserRole.EDITOR,
    };

    const tokens = await service.login({
      login: 'editor01',
      password: 'secret123',
    });

    const accessPayload = verify(tokens.accessToken, config.JWT_SECRET) as any;
    const refreshPayload = verify(tokens.refreshToken, config.JWT_REFRESH_SECRET) as any;

    assert.equal(accessPayload.userId, USER_ID);
    assert.equal(accessPayload.login, 'editor01');
    assert.equal(accessPayload.role, UserRole.EDITOR);
    assert.equal(refreshPayload.userId, USER_ID);
    assert.equal(refreshPayload.login, 'editor01');
    assert.equal(refreshPayload.role, UserRole.EDITOR);
    assert.notEqual(state.user?.refreshTokenHash, tokens.refreshToken);
    assert.equal(
      await compare(tokens.refreshToken, state.user?.refreshTokenHash ?? ''),
      true,
    );
  });

  it('rejects login with invalid credentials', async () => {
    const { service } = createAuthService();

    await service.signup({
      login: 'viewer01',
      password: 'secret123',
    });

    await assert.rejects(
      service.login({
        login: 'viewer01',
        password: 'wrong-password',
      }),
      ForbiddenException,
    );
  });
});
