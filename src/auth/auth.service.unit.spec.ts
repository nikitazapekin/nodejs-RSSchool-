import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function createPrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'access-secret',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_ACCESS_TTL: '15m',
                JWT_REFRESH_TTL: '7d',
              };

              return config[key];
            }),
          },
        },
        {
          provide: AuthService,
          useFactory: (
            prismaService: PrismaService,
            configService: ConfigService,
          ) => new AuthService(prismaService, configService),
          inject: [PrismaService, ConfigService],
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('creates a viewer account on signup and hashes password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: 'hashed',
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.signup({ login: 'viewer01', password: 'secret123' });

    expect(result).toEqual({ message: 'User created successfully' });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: UserRole.VIEWER,
        }),
      }),
    );
    const passwordArg = prisma.user.create.mock.calls[0][0].data.password as string;
    expect(passwordArg).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', passwordArg)).toBe(true);
  });

  it('rejects duplicate signup login', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });

    await expect(
      service.signup({ login: 'viewer01', password: 'secret123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates JWT access and refresh tokens on login', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      login: 'editor01',
      password: passwordHash,
      refreshTokenHash: null,
      role: UserRole.EDITOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({});

    const updateSpy = vi.spyOn(prisma.user, 'update');
    const tokens = await service.login({ login: 'editor01', password: 'secret123' });

    const accessPayload = jwt.verify(tokens.accessToken, 'access-secret') as jwt.JwtPayload;
    const refreshPayload = jwt.verify(tokens.refreshToken, 'refresh-secret') as jwt.JwtPayload;

    expect(accessPayload.userId).toBe(USER_ID);
    expect(accessPayload.role).toBe(UserRole.EDITOR);
    expect(refreshPayload.userId).toBe(USER_ID);
    expect(updateSpy).toHaveBeenCalled();
  });

  it('verifies a valid access token', () => {
    const token = jwt.sign(
      { userId: USER_ID, login: 'viewer01', role: UserRole.VIEWER },
      'access-secret',
      { expiresIn: '15m' },
    );

    expect(service.verifyAccessToken(token)).toEqual({
      userId: USER_ID,
      login: 'viewer01',
      role: UserRole.VIEWER,
    });
  });

  it('rejects invalid credentials on login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: await bcrypt.hash('secret123', 10),
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.login({ login: 'viewer01', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rotates refresh tokens', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    let refreshTokenHash: string | null = null;

    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.login === 'viewer01' || where.id === USER_ID) {
        return {
          id: USER_ID,
          login: 'viewer01',
          password: passwordHash,
          refreshTokenHash,
          role: UserRole.VIEWER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return null;
    });
    prisma.user.update.mockImplementation(async ({ data }) => {
      refreshTokenHash = data.refreshTokenHash;
      return {};
    });

    const firstPair = await service.login({ login: 'viewer01', password: 'secret123' });
    const secondPair = await service.refresh(firstPair.refreshToken);

    expect(secondPair.refreshToken).not.toBe(firstPair.refreshToken);
    expect(secondPair.accessToken).not.toBe(firstPair.accessToken);
    expect(await bcrypt.compare(secondPair.refreshToken, refreshTokenHash ?? '')).toBe(true);
  });

  it('rejects expired access token', () => {
    const token = jwt.sign(
      { userId: USER_ID, login: 'viewer01', role: UserRole.VIEWER },
      'access-secret',
      { expiresIn: '-1s' },
    );

    expect(() => service.verifyAccessToken(token)).toThrow(UnauthorizedException);
  });

  it('rejects tampered refresh token', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    let refreshTokenHash: string | null = null;

    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.login === 'viewer01' || where.id === USER_ID) {
        return {
          id: USER_ID,
          login: 'viewer01',
          password: passwordHash,
          refreshTokenHash,
          role: UserRole.VIEWER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return null;
    });
    prisma.user.update.mockImplementation(async ({ data }) => {
      refreshTokenHash = data.refreshTokenHash;
      return {};
    });

    const firstPair = await service.login({ login: 'viewer01', password: 'secret123' });

    await expect(service.refresh(`${firstPair.refreshToken}tampered`)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects missing refresh token', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('checks RBAC permissions by role list', () => {
    expect(
      service.hasRequiredRole(
        { userId: USER_ID, login: 'admin01', role: UserRole.ADMIN },
        [UserRole.ADMIN, UserRole.EDITOR],
      ),
    ).toBe(true);
    expect(
      service.hasRequiredRole(
        { userId: USER_ID, login: 'viewer01', role: UserRole.VIEWER },
        [UserRole.ADMIN],
      ),
    ).toBe(false);
    expect(service.hasRequiredRole(undefined, [UserRole.ADMIN])).toBe(false);
  });

  it('logs out with a valid refresh token', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    let refreshTokenHash: string | null = null;

    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.login === 'viewer01' || where.id === USER_ID) {
        return {
          id: USER_ID,
          login: 'viewer01',
          password: passwordHash,
          refreshTokenHash,
          role: UserRole.VIEWER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return null;
    });
    prisma.user.update.mockImplementation(async ({ data }) => {
      refreshTokenHash = data.refreshTokenHash;
      return {};
    });

    const pair = await service.login({ login: 'viewer01', password: 'secret123' });

    await expect(service.logout(pair.refreshToken)).resolves.toEqual({
      message: 'Logged out successfully',
    });
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: USER_ID },
      data: { refreshTokenHash: null },
    });
  });

  it('maps unknown access token errors to UnauthorizedException', () => {
    const error = (service as any).mapJwtError(new Error('boom'), 'Access token is invalid');
    expect(error).toBeInstanceOf(UnauthorizedException);
  });

  it('maps unknown refresh token errors to ForbiddenException', () => {
    const error = (service as any).mapJwtError(new Error('boom'), 'Refresh token is invalid', true);
    expect(error).toBeInstanceOf(ForbiddenException);
  });

  it('throws when required config is missing', () => {
    expect(() => (service as any).getRequiredConfig('MISSING_CONFIG')).toThrow(
      'Missing required config: MISSING_CONFIG',
    );
  });

  it('rejects logout when refresh token hash is missing', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: 'hashed',
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const refreshToken = jwt.sign(
      { userId: USER_ID, login: 'viewer01', role: UserRole.VIEWER, tokenId: '1' },
      'refresh-secret',
      { expiresIn: '7d' },
    );

    await expect(service.logout(refreshToken)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
