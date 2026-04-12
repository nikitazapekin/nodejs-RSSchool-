import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NotFoundException } from '@nestjs/common';

import { ArticleStatus } from '../src/common/enums/article-status.enum';
import { SortOrder } from '../src/common/enums/sort-order.enum';
import { ArticleService } from '../src/article/article.service';

const ARTICLE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

function createArticleService() {
  const prisma = {
    article: {
      findMany: async (_args?: any) => [],
      findUnique: async (_args?: any) => null,
      create: async ({ data }: any) => ({
        id: ARTICLE_ID,
        title: data.title,
        content: data.content,
        status: data.status,
        authorId: USER_ID,
        categoryId: CATEGORY_ID,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        tags: [{ name: 'nestjs' }, { name: 'typescript' }],
      }),
      update: async ({ data }: any) => ({
        id: ARTICLE_ID,
        title: data.title ?? 'Article',
        content: data.content ?? 'Content',
        status: data.status ?? ArticleStatus.DRAFT,
        authorId: null,
        categoryId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        tags: [{ name: 'prisma' }],
      }),
      delete: async () => undefined,
    },
    user: {
      findUnique: async () => ({ id: USER_ID }),
    },
    category: {
      findUnique: async () => ({ id: CATEGORY_ID }),
    },
    $transaction: async (callback: any) => callback(prisma),
  } as any;

  return {
    prisma,
    service: new ArticleService(prisma),
  };
}

describe('ArticleService', () => {
  it('creates an article with default draft status and connectOrCreate tags', async () => {
    const { service, prisma } = createArticleService();
    let capturedData: any;

    prisma.article.create = async ({ data }: any) => {
      capturedData = data;
      return {
        id: ARTICLE_ID,
        title: data.title,
        content: data.content,
        status: data.status,
        authorId: null,
        categoryId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        tags: [{ name: 'nestjs' }, { name: 'typescript' }],
      };
    };

    const article = await service.create({
      title: 'Article',
      content: 'Content',
      tags: ['nestjs', 'typescript'],
    });

    assert.equal(article.status, ArticleStatus.DRAFT);
    assert.deepEqual(article.tags, ['nestjs', 'typescript']);
    assert.equal(capturedData.tags.connectOrCreate.length, 2);
  });

  it('forwards Prisma where clauses for article filtering', async () => {
    const { service, prisma } = createArticleService();
    let capturedArgs: any;

    prisma.article.findMany = async (args: any) => {
      capturedArgs = args;
      return [
        {
          id: ARTICLE_ID,
          title: 'Filtered',
          content: 'Content',
          status: ArticleStatus.PUBLISHED,
          authorId: USER_ID,
          categoryId: CATEGORY_ID,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          tags: [{ name: 'prisma' }],
        },
      ];
    };

    const result = await service.findAll({
      status: ArticleStatus.PUBLISHED,
      categoryId: CATEGORY_ID,
      tag: 'prisma',
      sortBy: 'title',
      order: SortOrder.ASC,
    });

    assert.equal(Array.isArray(result), true);
    assert.equal(capturedArgs.where.status, ArticleStatus.PUBLISHED);
    assert.equal(capturedArgs.where.categoryId, CATEGORY_ID);
    assert.equal(capturedArgs.where.tags.some.name, 'prisma');
    assert.equal((result as any[])[0].tags[0], 'prisma');
  });

  it('replaces tags and disconnects nullable relations on update', async () => {
    const { service, prisma } = createArticleService();
    let capturedData: any;

    prisma.article.findUnique = async () => ({
      id: ARTICLE_ID,
      title: 'Old title',
      content: 'Old content',
      status: ArticleStatus.DRAFT,
      authorId: USER_ID,
      categoryId: CATEGORY_ID,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      tags: [{ name: 'nestjs' }],
    });

    prisma.article.update = async ({ data }: any) => {
      capturedData = data;
      return {
        id: ARTICLE_ID,
        title: 'New title',
        content: 'Old content',
        status: ArticleStatus.PUBLISHED,
        authorId: null,
        categoryId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        tags: [{ name: 'prisma' }],
      };
    };

    const article = await service.update(ARTICLE_ID, {
      title: 'New title',
      status: ArticleStatus.PUBLISHED,
      authorId: null,
      categoryId: null,
      tags: ['prisma'],
    });

    assert.equal(article.title, 'New title');
    assert.equal(capturedData.author.disconnect, true);
    assert.equal(capturedData.category.disconnect, true);
    assert.deepEqual(capturedData.tags.set, []);
    assert.equal(capturedData.tags.connectOrCreate[0].where.name, 'prisma');
  });

  it('throws NotFoundException when deleting a missing article', async () => {
    const { service } = createArticleService();

    await assert.rejects(service.delete(ARTICLE_ID), NotFoundException);
  });
});
