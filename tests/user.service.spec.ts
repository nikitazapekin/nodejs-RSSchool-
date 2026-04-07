import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { InMemoryDataService } from '../src/database/in-memory-data.service';
import { UserService } from '../src/user/user.service';
import { UserRole } from '../src/common/enums/user-role.enum';
import { ListQueryDto } from '../src/common/dto/list-query.dto';
import { SortOrder } from '../src/common/enums/sort-order.enum';

describe('UserService', () => {
  let service: UserService;
  let dataService: InMemoryDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, InMemoryDataService],
    }).compile();

    service = module.get<UserService>(UserService);
    dataService = module.get<InMemoryDataService>(InMemoryDataService);
  });

  it('should create a user with default viewer role when role is not specified', () => {
    const user = service.create({ login: 'testuser', password: 'secret123' });

    assert.ok(user);
    assert.equal(user.login, 'testuser');
    assert.equal(user.role, UserRole.VIEWER);
    assert.ok(user.id);
    assert.ok(user.createdAt);
    assert.ok(user.updatedAt);
 
    assert.equal((user as any).password, undefined);
  });

  it('should create a user with specified role', () => {
    const user = service.create({ login: 'adminuser', password: 'adminpass', role: UserRole.ADMIN });

    assert.equal(user.role, UserRole.ADMIN);
    assert.equal(user.login, 'adminuser');
  });

  it('should update password when old password is correct', () => {
    const createdUser = service.create({ login: 'passuser', password: 'oldpass' });
 
    const updatedUser = service.updatePassword(createdUser.id, {
      oldPassword: 'oldpass',
      newPassword: 'newpass',
    });

    assert.equal(updatedUser.login, 'passuser');
    assert.ok(updatedUser.updatedAt >= createdUser.updatedAt);
  });

  it('should throw ForbiddenException when old password is incorrect', () => {
    const createdUser = service.create({ login: 'passuser', password: 'oldpass' });

    assert.throws(
      () =>
        service.updatePassword(createdUser.id, {
          oldPassword: 'wrongpass',
          newPassword: 'newpass',
        }),
      ForbiddenException,
    );
  });

  it('should find all users and return them as public users (without password)', () => {
    service.create({ login: 'user1', password: 'pass1' });
    service.create({ login: 'user2', password: 'pass2', role: UserRole.EDITOR });

    const users = service.findAll({});

    assert.equal(Array.isArray(users), true);
    assert.equal((users as any[]).length, 2);
    assert.ok((users as any[]).every((u) => u.password === undefined));
  });

  it('should find one user by id', () => {
    const createdUser = service.create({ login: 'findme', password: 'pass' });

    const foundUser = service.findOne(createdUser.id);

    assert.equal(foundUser.id, createdUser.id);
    assert.equal(foundUser.login, 'findme');
    assert.equal((foundUser as any).password, undefined);
  });

  it('should throw NotFoundException when finding non-existent user', () => {
    const fakeId = randomUUID();

    assert.throws(() => service.findOne(fakeId), NotFoundException);
  });

  it('should delete user and cascade nullify authorId in articles and remove user comments', () => {
 
    const user = service.create({ login: 'deleteme', password: 'pass' });

 
    dataService.articles.push({
      id: randomUUID(),
      title: 'Test Article',
      content: 'Content',
      status: 'draft' as any,
      authorId: user.id,
      categoryId: null,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
 
    dataService.comments.push({
      id: randomUUID(),
      content: 'Test Comment',
      articleId: randomUUID(),
      authorId: user.id,
      createdAt: Date.now(),
    });
 
    const otherUserId = randomUUID();
    dataService.comments.push({
      id: randomUUID(),
      content: 'Other Comment',
      articleId: randomUUID(),
      authorId: otherUserId,
      createdAt: Date.now(),
    });

    service.delete(user.id);
 
    assert.equal(dataService.users.length, 0);

 
    assert.equal(dataService.articles[0].authorId, null);
 
    assert.equal(dataService.comments.length, 1);
    assert.equal(dataService.comments[0].authorId, otherUserId);
  });

  it('should throw NotFoundException when deleting non-existent user', () => {
    assert.throws(() => service.delete(randomUUID()), NotFoundException);
  });

  it('should support pagination and sorting', () => {
    service.create({ login: 'charlie', password: 'pass', role: UserRole.VIEWER });
    service.create({ login: 'alice', password: 'pass', role: UserRole.ADMIN });
    service.create({ login: 'bob', password: 'pass', role: UserRole.EDITOR });

    const sortedUsers = service.findAll({ sortBy: 'login', order: SortOrder.ASC } as ListQueryDto);
    assert.equal(Array.isArray(sortedUsers), true);
    assert.equal((sortedUsers as any[])[0].login, 'alice');
    assert.equal((sortedUsers as any[])[1].login, 'bob');
    assert.equal((sortedUsers as any[])[2].login, 'charlie');

    const paginatedUsers = service.findAll({ page: 1, limit: 2 } as ListQueryDto);
    assert.ok((paginatedUsers as any).data);
    assert.equal((paginatedUsers as any).total, 3);
    assert.equal((paginatedUsers as any).page, 1);
    assert.equal((paginatedUsers as any).limit, 2);
    assert.equal((paginatedUsers as any).data.length, 2);
  });
});
