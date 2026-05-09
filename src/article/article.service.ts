import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  ArticleStatus as PrismaArticleStatus,
  Prisma,
} from '@prisma/client';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { Article } from '../common/interfaces/article.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { ArticleModel } from '../common/models/article.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { PrismaService } from '../database/prisma.service';
import { toArticleRecord } from '../database/mappers';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ArticleListQueryDto } from './dto/article-list-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  private static readonly sortableFields: Array<keyof ArticleModel & string> = [
    'title',
    'status',
    'createdAt',
    'updatedAt',
  ];

  private static readonly validStatusTransitions: Record<
    ArticleStatus,
    ArticleStatus[]
  > = {
    [ArticleStatus.DRAFT]: [ArticleStatus.DRAFT, ArticleStatus.PUBLISHED],
    [ArticleStatus.PUBLISHED]: [ArticleStatus.PUBLISHED, ArticleStatus.ARCHIVED],
    [ArticleStatus.ARCHIVED]: [ArticleStatus.ARCHIVED],
  };

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ArticleListQueryDto,
  ): Promise<Article[] | PaginatedResponse<Article>> {
    const filteredArticles = (
      await this.prisma.article.findMany({
        where: {
          ...(query.status ? { status: query.status as PrismaArticleStatus } : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.tag
            ? {
                tags: {
                  some: {
                    name: query.tag,
                  },
                },
              }
            : {}),
        },
        include: {
          tags: {
            select: {
              name: true,
            },
          },
        },
      })
    ).map(toArticleRecord);

    const sortedArticles = sortItems(filteredArticles, {
      sortBy: query.sortBy,
      order: query.order,
      allowedSortFields: ArticleService.sortableFields,
    });

    return paginateItems(sortedArticles, {
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: string): Promise<Article> {
    return this.findRecordById(id);
  }

  async create(dto: CreateArticleDto, currentUser?: AuthUser): Promise<Article> {
    const authorId = this.resolveAuthorId(dto.authorId, currentUser);
    await this.ensureArticleRelations(authorId, dto.categoryId);

    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: (dto.status ?? ArticleStatus.DRAFT) as PrismaArticleStatus,
        ...(authorId
          ? {
              author: {
                connect: {
                  id: authorId,
                },
              },
            }
          : {}),
        ...(dto.categoryId
          ? {
              category: {
                connect: {
                  id: dto.categoryId,
                },
              },
            }
          : {}),
        ...(dto.tags?.length
          ? {
              tags: {
                connectOrCreate: dto.tags.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              },
            }
          : {}),
      },
      include: {
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    return toArticleRecord(article);
  }

  async update(id: string, dto: UpdateArticleDto, currentUser?: AuthUser): Promise<Article> {
    const existingArticle = await this.findRecordById(id);
    this.ensureCanManageArticle(existingArticle, currentUser);
    this.ensureValidStatusTransition(existingArticle.status, dto.status);

    const authorId = this.resolveAuthorId(dto.authorId, currentUser, existingArticle.authorId);
    await this.ensureArticleRelations(authorId, dto.categoryId);

    const data: Prisma.ArticleUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.content !== undefined ? { content: dto.content } : {}),
      ...(dto.status !== undefined
        ? { status: dto.status as PrismaArticleStatus }
        : {}),
      ...(dto.authorId !== undefined || currentUser?.role === UserRole.EDITOR
        ? {
            author: authorId
              ? {
                  connect: {
                    id: authorId,
                  },
                }
              : {
                  disconnect: true,
                },
          }
        : {}),
      ...(dto.categoryId !== undefined
        ? {
            category: dto.categoryId
              ? {
                  connect: {
                    id: dto.categoryId,
                  },
                }
              : {
                  disconnect: true,
                },
          }
        : {}),
    };

    if (dto.tags !== undefined) {
      data.tags = {
        set: [],
        ...(dto.tags.length
          ? {
              connectOrCreate: dto.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : {}),
      };
    }

    const article = await this.prisma.article.update({
      where: { id },
      data,
      include: {
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    return toArticleRecord(article);
  }

  async delete(id: string, currentUser?: AuthUser): Promise<void> {
    const existingArticle = await this.findRecordById(id);
    this.ensureCanManageArticle(existingArticle, currentUser);

    await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!article) {
        throw new NotFoundException(`Article with id "${id}" not found`);
      }

      await tx.article.delete({
        where: { id },
      });
    });
  }

  private async findRecordById(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with id "${id}" not found`);
    }

    return toArticleRecord(article);
  }

  private async ensureArticleRelations(
    authorId?: string | null,
    categoryId?: string | null,
  ): Promise<void> {
    if (authorId) {
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { id: true },
      });

      if (!author) {
        throw new UnprocessableEntityException(
          `User with id "${authorId}" does not exist`,
        );
      }
    }

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!category) {
        throw new UnprocessableEntityException(
          `Category with id "${categoryId}" does not exist`,
        );
      }
    }
  }

  private resolveAuthorId(
    requestedAuthorId: string | null | undefined,
    currentUser?: AuthUser,
    fallbackAuthorId?: string | null,
  ): string | null | undefined {
    if (!currentUser) {
      return requestedAuthorId;
    }

    if (currentUser.role === UserRole.ADMIN) {
      return requestedAuthorId ?? fallbackAuthorId;
    }

    if (currentUser.role === UserRole.EDITOR) {
      if (
        requestedAuthorId !== undefined &&
        requestedAuthorId !== null &&
        requestedAuthorId !== currentUser.userId
      ) {
        throw new ForbiddenException('Editors can manage only their own articles');
      }

      return currentUser.userId;
    }

    return requestedAuthorId ?? fallbackAuthorId;
  }

  private ensureCanManageArticle(
    article: Article,
    currentUser?: AuthUser,
  ): void {
    if (!currentUser || currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role !== UserRole.EDITOR || article.authorId !== currentUser.userId) {
      throw new ForbiddenException('You are not allowed to manage this article');
    }
  }

  private ensureValidStatusTransition(
    currentStatus: ArticleStatus,
    nextStatus?: ArticleStatus,
  ): void {
    if (!nextStatus) {
      return;
    }

    if (!ArticleService.validStatusTransitions[currentStatus].includes(nextStatus)) {
      throw new UnprocessableEntityException(
        `Invalid article status transition from "${currentStatus}" to "${nextStatus}"`,
      );
    }
  }
}
