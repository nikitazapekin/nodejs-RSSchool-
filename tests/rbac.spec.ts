import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ForbiddenException } from '@nestjs/common';

import { ArticleController } from '../src/article/article.controller';
import { UserRole } from '../src/common/enums/user-role.enum';
import { CommentController } from '../src/comment/comment.controller';
import { CategoryController } from '../src/category/category.controller';
import { UserController } from '../src/user/user.controller';

const VIEWER = {
  userId: '11111111-1111-4111-8111-111111111111',
  login: 'viewer01',
  role: UserRole.VIEWER,
};

const EDITOR = {
  userId: '22222222-2222-4222-8222-222222222222',
  login: 'editor01',
  role: UserRole.EDITOR,
};

describe('RBAC', () => {
  it('blocks viewer from creating articles and comments', async () => {
    const articleController = new ArticleController({} as any);
    const commentController = new CommentController({} as any);

    assert.throws(
      () => articleController.create(VIEWER, { title: 'A', content: 'B' } as any),
      ForbiddenException,
    );
    assert.throws(
      () => commentController.create(VIEWER, { content: 'A', articleId: 'x' } as any),
      ForbiddenException,
    );
  });

  it('blocks viewer from updating and deleting articles', async () => {
    const articleController = new ArticleController({
      update: () => undefined,
      delete: async () => undefined,
    } as any);

    assert.throws(
      () => articleController.update(VIEWER, '11111111-1111-4111-8111-111111111111', {}),
      ForbiddenException,
    );
    await assert.rejects(
      articleController.delete(VIEWER, '11111111-1111-4111-8111-111111111111'),
      ForbiddenException,
    );
  });

  it('blocks non-admin users from managing categories and users', async () => {
    const categoryController = new CategoryController({} as any);
    const userController = new UserController({} as any);

    assert.throws(
      () => categoryController.create(EDITOR, { name: 'Backend', description: 'API' }),
      ForbiddenException,
    );
    assert.throws(
      () =>
        userController.updateRole(
          EDITOR,
          '11111111-1111-4111-8111-111111111111',
          { role: UserRole.ADMIN },
        ),
      ForbiddenException,
    );
  });
});
