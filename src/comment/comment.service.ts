import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { Comment } from '../common/interfaces/comment.interface';
import { CommentModel } from '../common/models/comment.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { InMemoryDataService } from '../database/in-memory-data.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentListQueryDto } from './dto/comment-list-query.dto';

@Injectable()
export class CommentService {
  private static readonly sortableFields: Array<keyof CommentModel & string> = ['createdAt'];

  constructor(private readonly dataService: InMemoryDataService) {}

  findAll(query: CommentListQueryDto): Comment[] | PaginatedResponse<Comment> {
    const articleComments = this.dataService.comments.filter(
      (comment) => comment.articleId === query.articleId,
    );

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

  create(dto: CreateCommentDto): Comment {
    const articleExists = this.dataService.articles.some(
      (article) => article.id === dto.articleId,
    );

    if (!articleExists) {
      throw new UnprocessableEntityException(
        `Article with id "${dto.articleId}" does not exist`,
      );
    }

    const comment: Comment = {
      id: randomUUID(),
      content: dto.content,
      articleId: dto.articleId,
      authorId: dto.authorId ?? null,
      createdAt: Date.now(),
    };

    this.dataService.comments.push(comment);
    return comment;
  }

  delete(id: string): void {
    const commentIndex = this.dataService.comments.findIndex((comment) => comment.id === id);

    if (commentIndex === -1) {
      throw new NotFoundException(`Comment with id "${id}" not found`);
    }

    this.dataService.comments.splice(commentIndex, 1);
  }
}
