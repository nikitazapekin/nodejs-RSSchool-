import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { SortOrder } from '../src/common/enums/sort-order.enum';
import { CommentService } from '../src/comment/comment.service';

const ARTICLE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COMMENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = '11111111-1111-4111-8111-111111111111';

function createCommentService() {
  const prisma = {
    article: {
      findUnique: async () => ({ id: ARTICLE_ID }),
    },
    user: {
      findUnique: async () => ({ id: USER_ID }),
    },
    comment: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async ({ data }: any) => ({
        id: COMMENT_ID,
        content: data.content,
        articleId: data.articleId,
        authorId: data.authorId,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      delete: async () => undefined,
    },
  } as any;

  return {
    prisma,
    service: new CommentService(prisma),
  };
}

describe('CommentService', () => {
  it('creates a comment for an existing article', async () => {
    const { service } = createCommentService();

    const comment = await service.create({
      content: 'Useful article',
      articleId: ARTICLE_ID,
      authorId: USER_ID,
    });

    assert.equal(comment.id, COMMENT_ID);
    assert.equal(comment.articleId, ARTICLE_ID);
    assert.equal(comment.authorId, USER_ID);
    assert.equal(comment.createdAt, Date.parse('2026-01-01T00:00:00.000Z'));
  });

  it('throws UnprocessableEntityException when article does not exist', async () => {
    const { service, prisma } = createCommentService();

    prisma.article.findUnique = async () => null;

    await assert.rejects(
      service.create({
        content: 'Orphan comment',
        articleId: ARTICLE_ID,
      }),
      UnprocessableEntityException,
    );
  });

  it('returns sorted and paginated comments for an article', async () => {
    const { service, prisma } = createCommentService();

    prisma.comment.findMany = async () => [
      {
        id: '1',
        content: 'Newest',
        articleId: ARTICLE_ID,
        authorId: null,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
      {
        id: '2',
        content: 'Oldest',
        articleId: ARTICLE_ID,
        authorId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: '3',
        content: 'Middle',
        articleId: ARTICLE_ID,
        authorId: null,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ];

    const result = await service.findAll({
      articleId: ARTICLE_ID,
      sortBy: 'createdAt',
      order: SortOrder.ASC,
      page: 1,
      limit: 2,
    });

    assert.equal((result as any).total, 3);
    assert.equal((result as any).data[0].content, 'Oldest');
    assert.equal((result as any).data[1].content, 'Middle');
  });

  it('throws NotFoundException when deleting a missing comment', async () => {
    const { service } = createCommentService();

    await assert.rejects(service.delete(COMMENT_ID), NotFoundException);
  });
});
