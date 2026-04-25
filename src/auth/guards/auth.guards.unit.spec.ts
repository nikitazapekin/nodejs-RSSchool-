import 'reflect-metadata';

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../common/enums/user-role.enum';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

function createExecutionContext(request: Record<string, unknown> = {}) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let authService: { verifyAccessToken: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    authService = {
      verifyAccessToken: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: Reflector,
          useValue: reflector,
        },
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: JwtAuthGuard,
          useFactory: (appReflector: Reflector, appAuthService: AuthService) =>
            new JwtAuthGuard(appReflector, appAuthService),
          inject: [Reflector, AuthService],
        },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
  });

  it('passes with a valid bearer token and attaches user', () => {
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
      path: '/article',
    };
    authService.verifyAccessToken.mockReturnValue({
      userId: 'user-1',
      login: 'editor01',
      role: UserRole.EDITOR,
    });

    expect(guard.canActivate(createExecutionContext(request))).toBe(true);
    expect(request).toHaveProperty('user.login', 'editor01');
  });

  it('throws when authorization header is missing', () => {
    expect(() =>
      guard.canActivate(
        createExecutionContext({
          headers: {},
          path: '/article',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('throws on malformed authorization header', () => {
    expect(() =>
      guard.canActivate(
        createExecutionContext({
          headers: {
            authorization: 'Basic token',
          },
          path: '/article',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('propagates expired token error', () => {
    authService.verifyAccessToken.mockImplementation(() => {
      throw new UnauthorizedException('Access token has expired');
    });

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          headers: {
            authorization: 'Bearer expired-token',
          },
          path: '/article',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('skips auth for @Public routes', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );

    expect(
      guard.canActivate(
        createExecutionContext({
          headers: {},
          path: '/auth/login',
        }),
      ),
    ).toBe(true);
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let authService: { hasRequiredRole: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    authService = {
      hasRequiredRole: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: Reflector,
          useValue: reflector,
        },
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: RolesGuard,
          useFactory: (appReflector: Reflector, appAuthService: AuthService) =>
            new RolesGuard(appReflector, appAuthService),
          inject: [Reflector, AuthService],
        },
      ],
    }).compile();

    guard = moduleRef.get(RolesGuard);
  });

  it('grants access for a correct role', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ROLES_KEY ? [UserRole.ADMIN] : undefined,
    );
    authService.hasRequiredRole.mockReturnValue(true);

    expect(
      guard.canActivate(
        createExecutionContext({
          user: {
            userId: 'user-1',
            login: 'admin01',
            role: UserRole.ADMIN,
          },
        }),
      ),
    ).toBe(true);
  });

  it('throws for insufficient role', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ROLES_KEY ? [UserRole.ADMIN] : undefined,
    );
    authService.hasRequiredRole.mockReturnValue(false);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          user: {
            userId: 'user-1',
            login: 'viewer01',
            role: UserRole.VIEWER,
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows access when @Roles metadata is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext({}))).toBe(true);
    expect(authService.hasRequiredRole).not.toHaveBeenCalled();
  });
});
