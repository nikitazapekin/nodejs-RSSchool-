import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { SortOrder } from '../src/common/enums/sort-order.enum';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserService } from '../src/user/user.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function createUserService() {
  const prisma = {
    user: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async ({ data }: any) => ({
        id: USER_ID,
        login: data.login,
        password: data.password,
        role: data.role,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      update: async ({ data }: any) => ({
        id: USER_ID,
        login: 'user01',
        password: data.password,
        role: UserRole.VIEWER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
      delete: async () => undefined,
    },
    $transaction: async (callback: any) => callback(prisma),
  } as any;

  return {
    prisma,
    service: new UserService(prisma),
  };
}

describe('UserService', () => {
  it('creates a public user with default viewer role', async () => {
    const { service } = createUserService();

    const user = await service.create({
      login: 'user01',
      password: 'secret123',
    });

    assert.equal(user.id, USER_ID);
    assert.equal(user.login, 'user01');
    assert.equal(user.role, UserRole.VIEWER);
    assert.equal((user as unknown as Record<string, unknown>).password, undefined);
    assert.equal(user.createdAt, Date.parse('2026-01-01T00:00:00.000Z'));
  });

  it('updates password when old password matches', async () => {
    const { service, prisma } = createUserService();

    prisma.user.findUnique = async () => ({
      id: USER_ID,
      login: 'user01',
      password: 'old-pass',
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const user = await service.updatePassword(USER_ID, {
      oldPassword: 'old-pass',
      newPassword: 'new-pass',
    });

    assert.equal(user.id, USER_ID);
    assert.equal(user.updatedAt, Date.parse('2026-01-02T00:00:00.000Z'));
  });

  it('throws ForbiddenException when old password is incorrect', async () => {
    const { service, prisma } = createUserService();

    prisma.user.findUnique = async () => ({
      id: USER_ID,
      login: 'user01',
      password: 'old-pass',
      role: UserRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await assert.rejects(
      service.updatePassword(USER_ID, {
        oldPassword: 'wrong-pass',
        newPassword: 'new-pass',
      }),
      ForbiddenException,
    );
  });

  it('returns sorted public users with pagination', async () => {
    const { service, prisma } = createUserService();

    prisma.user.findMany = async () => [
      {
        id: '11111111-1111-4111-8111-111111111111',
        login: 'charlie',
        password: 'one',
        role: UserRole.VIEWER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        login: 'alice',
        password: 'two',
        role: UserRole.ADMIN,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        login: 'bob',
        password: 'three',
        role: UserRole.EDITOR,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    ];

    const result = await service.findAll({
      sortBy: 'login',
      order: SortOrder.ASC,
      page: 1,
      limit: 2,
    });

    assert.equal(Array.isArray(result), false);
    assert.equal((result as any).total, 3);
    assert.equal((result as any).data[0].login, 'alice');
    assert.equal((result as any).data[1].login, 'bob');
    assert.equal((result as any).data[0].password, undefined);
  });

  it('throws NotFoundException when deleting a missing user', async () => {
    const { service } = createUserService();

    await assert.rejects(service.delete(USER_ID), NotFoundException);
  });
});
