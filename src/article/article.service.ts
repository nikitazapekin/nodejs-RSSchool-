import {
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
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { ArticleModel } from '../common/models/article.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { PrismaService } from '../database/prisma.service';
import { toArticleRecord } from '../database/mappers';
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

  async create(dto: CreateArticleDto): Promise<Article> {
    await this.ensureArticleRelations(dto.authorId, dto.categoryId);

    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: (dto.status ?? ArticleStatus.DRAFT) as PrismaArticleStatus,
        ...(dto.authorId
          ? {
              author: {
                connect: {
                  id: dto.authorId,
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

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    await this.findRecordById(id);
    await this.ensureArticleRelations(dto.authorId, dto.categoryId);

    const data: Prisma.ArticleUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.content !== undefined ? { content: dto.content } : {}),
      ...(dto.status !== undefined
        ? { status: dto.status as PrismaArticleStatus }
        : {}),
      ...(dto.authorId !== undefined
        ? {
            author: dto.authorId
              ? {
                  connect: {
                    id: dto.authorId,
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

  async delete(id: string): Promise<void> {
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
}
