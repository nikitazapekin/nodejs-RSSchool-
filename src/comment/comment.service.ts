import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { Comment } from '../common/interfaces/comment.interface';
import { CommentModel } from '../common/models/comment.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { toCommentRecord } from '../database/mappers';
import { PrismaService } from '../database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentListQueryDto } from './dto/comment-list-query.dto';

@Injectable()
export class CommentService {
  private static readonly sortableFields: Array<keyof CommentModel & string> = ['createdAt'];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: CommentListQueryDto,
  ): Promise<Comment[] | PaginatedResponse<Comment>> {
    const articleComments = (
      await this.prisma.comment.findMany({
        where: {
          articleId: query.articleId,
        },
      })
    ).map(toCommentRecord);

    const sortedComments = sortItems(articleComments, {
      sortBy: query.sortBy,
      order: query.order,
      allowedSortFields: CommentService.sortableFields,
    });

    return paginateItems(sortedComments, {
      page: query.page,
      limit: query.limit,
    });
  }

  async create(dto: CreateCommentDto): Promise<Comment> {
    const article = await this.prisma.article.findUnique({
      where: {
        id: dto.articleId,
      },
      select: {
        id: true,
      },
    });

    if (!article) {
      throw new UnprocessableEntityException(
        `Article with id "${dto.articleId}" does not exist`,
      );
    }

    if (dto.authorId) {
      const author = await this.prisma.user.findUnique({
        where: { id: dto.authorId },
        select: { id: true },
      });

      if (!author) {
        throw new UnprocessableEntityException(
          `User with id "${dto.authorId}" does not exist`,
        );
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        articleId: dto.articleId,
        authorId: dto.authorId ?? null,
      },
    });

    return toCommentRecord(comment);
  }

  async delete(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with id "${id}" not found`);
    }

    await this.prisma.comment.delete({
      where: { id },
    });
  }
}
