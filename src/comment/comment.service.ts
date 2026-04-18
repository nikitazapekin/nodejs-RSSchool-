import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
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

  async create(dto: CreateCommentDto, currentUser?: AuthUser): Promise<Comment> {
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

    const authorId = this.resolveAuthorId(dto.authorId, currentUser);

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

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        articleId: dto.articleId,
        authorId: authorId ?? null,
      },
    });

    return toCommentRecord(comment);
  }

  async delete(id: string, currentUser?: AuthUser): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with id "${id}" not found`);
    }

    this.ensureCanManageComment(comment.authorId, currentUser);

    await this.prisma.comment.delete({
      where: { id },
    });
  }

  private resolveAuthorId(
    requestedAuthorId: string | null | undefined,
    currentUser?: AuthUser,
  ): string | null | undefined {
    if (!currentUser) {
      return requestedAuthorId;
    }

    if (currentUser.role === UserRole.ADMIN) {
      return requestedAuthorId;
    }

    if (
      requestedAuthorId !== undefined &&
      requestedAuthorId !== null &&
      requestedAuthorId !== currentUser.userId
    ) {
      throw new ForbiddenException('Editors can create only their own comments');
    }

    return currentUser.userId;
  }

  private ensureCanManageComment(
    authorId: string | null,
    currentUser?: AuthUser,
  ): void {
    if (!currentUser || currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role !== UserRole.EDITOR || authorId !== currentUser.userId) {
      throw new ForbiddenException('You are not allowed to manage this comment');
    }
  }
}
