import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { SortOrder } from '../common/enums/sort-order.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../database/prisma.service';
import { ArticleService } from './article.service';

const ARTICLE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

function createPrismaMock() {
  return {
    article: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function articleRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: ARTICLE_ID,
    title: 'Article',
    content: 'Content',
    status: ArticleStatus.DRAFT,
    authorId: USER_ID,
    categoryId: CATEGORY_ID,
    tags: [{ name: 'nestjs' }],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ArticleService', () => {
  let service: ArticleService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let editor: AuthUser;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
    prisma.category.findUnique.mockResolvedValue({ id: CATEGORY_ID });
    editor = {
      userId: USER_ID,
      login: 'editor01',
      role: UserRole.EDITOR,
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ArticleService,
          useFactory: (prismaService: PrismaService) => new ArticleService(prismaService),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(ArticleService);
  });

  it('creates an article with default draft status and tags', async () => {
    prisma.article.create.mockImplementation(async ({ data }) =>
      articleRecord({
        title: data.title,
        content: data.content,
        status: data.status,
        tags: [{ name: 'nestjs' }, { name: 'typescript' }],
      }),
    );

    const result = await service.create({
      title: 'Article',
      content: 'Content',
      tags: ['nestjs', 'typescript'],
    });

    expect(result.status).toBe(ArticleStatus.DRAFT);
    expect(result.tags).toEqual(['nestjs', 'typescript']);
    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: {
            connectOrCreate: [
              { where: { name: 'nestjs' }, create: { name: 'nestjs' } },
              { where: { name: 'typescript' }, create: { name: 'typescript' } },
            ],
          },
        }),
      }),
    );
  });

  it('rejects article creation when related author is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        title: 'Article',
        content: 'Content',
        authorId: USER_ID,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.article.create).not.toHaveBeenCalled();
  });

  it('rejects article creation when category is missing', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        title: 'Article',
        content: 'Content',
        categoryId: CATEGORY_ID,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('forwards filtering parameters to Prisma', async () => {
    prisma.article.findMany.mockResolvedValue([
      articleRecord({
        status: ArticleStatus.PUBLISHED,
        tags: [{ name: 'prisma' }],
      }),
    ]);

    const result = await service.findAll({
      status: ArticleStatus.PUBLISHED,
      categoryId: CATEGORY_ID,
      tag: 'prisma',
      sortBy: 'title',
      order: SortOrder.ASC,
    });

    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ArticleStatus.PUBLISHED,
          categoryId: CATEGORY_ID,
          tags: {
            some: {
              name: 'prisma',
            },
          },
        },
      }),
    );
    expect(Array.isArray(result) && result[0].tags).toEqual(['prisma']);
  });

  it('allows draft to published transition', async () => {
    prisma.article.findUnique.mockResolvedValue(articleRecord());
    prisma.article.update.mockResolvedValue(
      articleRecord({
        status: ArticleStatus.PUBLISHED,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    );

    const result = await service.update(
      ARTICLE_ID,
      { status: ArticleStatus.PUBLISHED },
      editor,
    );

    expect(result.status).toBe(ArticleStatus.PUBLISHED);
  });

  it('allows published to archived transition', async () => {
    prisma.article.findUnique.mockResolvedValue(
      articleRecord({ status: ArticleStatus.PUBLISHED }),
    );
    prisma.article.update.mockResolvedValue(
      articleRecord({
        status: ArticleStatus.ARCHIVED,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    );

    const result = await service.update(
      ARTICLE_ID,
      { status: ArticleStatus.ARCHIVED },
      editor,
    );

    expect(result.status).toBe(ArticleStatus.ARCHIVED);
  });

  it('rejects invalid status transition', async () => {
    prisma.article.findUnique.mockResolvedValue(articleRecord());

    await expect(
      service.update(ARTICLE_ID, { status: ArticleStatus.ARCHIVED }, editor),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.article.update).not.toHaveBeenCalled();
  });

  it('replaces tags and disconnects relations on update', async () => {
    prisma.article.findUnique.mockResolvedValue(articleRecord());
    prisma.article.update.mockImplementation(async ({ data }) =>
      articleRecord({
        title: data.title ?? 'Article',
        categoryId: null,
        authorId: null,
        tags: [{ name: 'prisma' }],
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    );

    const result = await service.update(
      ARTICLE_ID,
      {
        title: 'Updated',
        authorId: null,
        categoryId: null,
        tags: ['prisma'],
      },
      editor,
    );

    expect(result.tags).toEqual(['prisma']);
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          author: { connect: { id: USER_ID } },
          category: { disconnect: true },
          tags: {
            set: [],
            connectOrCreate: [{ where: { name: 'prisma' }, create: { name: 'prisma' } }],
          },
        }),
      }),
    );
  });

  it('forbids viewer from managing an article', async () => {
    prisma.article.findUnique.mockResolvedValue(articleRecord());

    await expect(
      service.update(
        ARTICLE_ID,
        { title: 'Blocked' },
        { userId: 'viewer-id', login: 'viewer01', role: UserRole.VIEWER },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids editor from assigning another author', async () => {
    prisma.article.findUnique.mockResolvedValue(articleRecord());

    await expect(
      service.update(
        ARTICLE_ID,
        { authorId: '33333333-3333-4333-8333-333333333333' },
        editor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admin to delete an article', async () => {
    prisma.article.findUnique
      .mockResolvedValueOnce(articleRecord())
      .mockResolvedValueOnce({ id: ARTICLE_ID });

    await expect(
      service.delete(ARTICLE_ID, {
        userId: 'admin-id',
        login: 'admin01',
        role: UserRole.ADMIN,
      }),
    ).resolves.toBeUndefined();
    expect(prisma.article.delete).toHaveBeenCalledWith({ where: { id: ARTICLE_ID } });
  });

  it('allows viewer payload to keep requested author on create when service is called directly', async () => {
    prisma.article.create.mockImplementation(async ({ data }) =>
      articleRecord({
        authorId: data.author?.connect?.id ?? null,
        categoryId: null,
        tags: [],
      }),
    );

    const result = await service.create(
      {
        title: 'Article',
        content: 'Content',
        authorId: USER_ID,
      },
      {
        userId: 'viewer-id',
        login: 'viewer01',
        role: UserRole.VIEWER,
      },
    );

    expect(result.authorId).toBe(USER_ID);
  });

  it('throws when article does not exist', async () => {
    prisma.article.findUnique.mockResolvedValue(null);

    await expect(service.findOne(ARTICLE_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
