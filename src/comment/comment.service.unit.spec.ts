import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SortOrder } from '../common/enums/sort-order.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../database/prisma.service';
import { CommentService } from './comment.service';

const ARTICLE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COMMENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = '11111111-1111-4111-8111-111111111111';

function createPrismaMock() {
  return {
    article: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('CommentService', () => {
  let service: CommentService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.article.findUnique.mockResolvedValue({ id: ARTICLE_ID });
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: CommentService,
          useFactory: (prismaService: PrismaService) => new CommentService(prismaService),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(CommentService);
  });

  it('creates a comment for an existing article', async () => {
    prisma.comment.create.mockImplementation(async ({ data }) => ({
      id: COMMENT_ID,
      content: data.content,
      articleId: data.articleId,
      authorId: data.authorId,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const result = await service.create({
      content: 'Useful article',
      articleId: ARTICLE_ID,
      authorId: USER_ID,
    });

    expect(result).toEqual({
      id: COMMENT_ID,
      content: 'Useful article',
      articleId: ARTICLE_ID,
      authorId: USER_ID,
      createdAt: Date.parse('2026-01-01T00:00:00.000Z'),
    });
  });

  it('rejects comment creation for a missing article', async () => {
    prisma.article.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ content: 'Orphan', articleId: ARTICLE_ID }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('forbids editor from creating a comment for another user', async () => {
    await expect(
      service.create(
        {
          content: 'Blocked',
          articleId: ARTICLE_ID,
          authorId: '22222222-2222-4222-8222-222222222222',
        },
        { userId: USER_ID, login: 'editor01', role: UserRole.EDITOR },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns sorted paginated comments', async () => {
    prisma.comment.findMany.mockResolvedValue([
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
    ]);

    const result = await service.findAll({
      articleId: ARTICLE_ID,
      sortBy: 'createdAt',
      order: SortOrder.ASC,
      page: 1,
      limit: 2,
    });

    expect(result).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect('data' in result && result.data.map((item) => item.content)).toEqual([
      'Oldest',
      'Middle',
    ]);
  });

  it('throws when deleting a missing comment', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(service.delete(COMMENT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows admin to delete a comment', async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: COMMENT_ID,
      authorId: USER_ID,
    });

    await expect(
      service.delete(COMMENT_ID, {
        userId: 'admin-id',
        login: 'admin01',
        role: UserRole.ADMIN,
      }),
    ).resolves.toBeUndefined();
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: COMMENT_ID } });
  });

  it('forbids editor from deleting another users comment', async () => {
    prisma.comment.findUnique.mockResolvedValue({
      id: COMMENT_ID,
      authorId: '22222222-2222-4222-8222-222222222222',
    });

    await expect(
      service.delete(COMMENT_ID, {
        userId: USER_ID,
        login: 'editor01',
        role: UserRole.EDITOR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
