import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SortOrder } from '../common/enums/sort-order.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../database/prisma.service';
import { UserService } from './user.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function createPrismaMock() {
  return {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('UserService', () => {
  let service: UserService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: UserService,
          useFactory: (prismaService: PrismaService) => new UserService(prismaService),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(UserService);
  });

  it('creates a user with hashed password and default viewer role', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: USER_ID,
      login: data.login,
      password: data.password,
      refreshTokenHash: null,
      role: data.role,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const user = await service.create({ login: 'viewer01', password: 'secret123' });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          login: 'viewer01',
          role: UserRole.VIEWER,
        }),
      }),
    );
    const passwordArg = prisma.user.create.mock.calls[0][0].data.password as string;
    expect(passwordArg).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', passwordArg)).toBe(true);
    expect(user).toEqual({
      id: USER_ID,
      login: 'viewer01',
      role: UserRole.VIEWER,
      createdAt: Date.parse('2026-01-01T00:00:00.000Z'),
      updatedAt: Date.parse('2026-01-01T00:00:00.000Z'),
    });
  });

  it('rejects duplicate login on create', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });

    await expect(
      service.create({ login: 'viewer01', password: 'secret123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('throws when requested user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findOne(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when old password does not match', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: await bcrypt.hash('old-pass', 10),
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.updatePassword(USER_ID, {
        oldPassword: 'wrong-pass',
        newPassword: 'new-pass',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates password when old password matches', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: await bcrypt.hash('old-pass', 10),
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prisma.user.update.mockImplementation(async ({ data }) => ({
      id: USER_ID,
      login: 'viewer01',
      password: data.password,
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    }));

    const result = await service.updatePassword(USER_ID, {
      oldPassword: 'old-pass',
      newPassword: 'new-pass',
    });

    expect(result.updatedAt).toBe(Date.parse('2026-01-02T00:00:00.000Z'));
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('updates a user role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: 'hashed',
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prisma.user.update.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: 'hashed',
      refreshTokenHash: null,
      role: UserRole.ADMIN,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const result = await service.updateRole(USER_ID, { role: UserRole.ADMIN });

    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('returns sorted public users with pagination', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        login: 'charlie',
        password: 'one',
        refreshTokenHash: null,
        role: UserRole.VIEWER,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      },
      {
        id: '11111111-1111-4111-8111-111111111111',
        login: 'alice',
        password: 'two',
        refreshTokenHash: null,
        role: UserRole.ADMIN,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        login: 'bob',
        password: 'three',
        refreshTokenHash: null,
        role: UserRole.EDITOR,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);

    const result = await service.findAll({
      sortBy: 'login',
      order: SortOrder.ASC,
      page: 1,
      limit: 2,
    });

    expect(result).toMatchObject({
      total: 3,
      page: 1,
      limit: 2,
    });
    expect('data' in result && result.data.map((item) => item.login)).toEqual([
      'alice',
      'bob',
    ]);
  });

  it('throws when deleting a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.delete(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('deletes an existing user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      login: 'viewer01',
      password: 'hashed',
      refreshTokenHash: null,
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(service.delete(USER_ID)).resolves.toBeUndefined();
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });
});
