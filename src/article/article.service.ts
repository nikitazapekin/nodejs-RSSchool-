import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ArticleStatus } from '../common/enums/article-status.enum';
import { Article } from '../common/interfaces/article.interface';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { ArticleModel } from '../common/models/article.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { InMemoryDataService } from '../database/in-memory-data.service';
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

  constructor(private readonly dataService: InMemoryDataService) {}

  findAll(query: ArticleListQueryDto): Article[] | PaginatedResponse<Article> {
    const filteredArticles = this.dataService.articles.filter((article) => {
      if (query.status && article.status !== query.status) {
        return false;
      }

      if (query.categoryId && article.categoryId !== query.categoryId) {
        return false;
      }

      if (query.tag && !article.tags.includes(query.tag)) {
        return false;
      }

      return true;
    });

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

  findOne(id: string): Article {
    return this.findRecordById(id);
  }

  create(dto: CreateArticleDto): Article {
    const timestamp = Date.now();
    const article: Article = {
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      status: dto.status ?? ArticleStatus.DRAFT,
      authorId: dto.authorId ?? null,
      categoryId: dto.categoryId ?? null,
      tags: dto.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.dataService.articles.push(article);
    return article;
  }

  update(id: string, dto: UpdateArticleDto): Article {
    const article = this.findRecordById(id);

    if (dto.title !== undefined) {
      article.title = dto.title;
    }

    if (dto.content !== undefined) {
      article.content = dto.content;
    }

    if (dto.status !== undefined) {
      article.status = dto.status;
    }

    if (dto.authorId !== undefined) {
      article.authorId = dto.authorId;
    }

    if (dto.categoryId !== undefined) {
      article.categoryId = dto.categoryId;
    }

    if (dto.tags !== undefined) {
      article.tags = dto.tags;
    }

    article.updatedAt = Date.now();

    return article;
  }

  delete(id: string): void {
    const articleIndex = this.dataService.articles.findIndex((article) => article.id === id);

    if (articleIndex === -1) {
      throw new NotFoundException(`Article with id "${id}" not found`);
    }

    this.dataService.articles.splice(articleIndex, 1);

    const filteredComments = this.dataService.comments.filter(
      (comment) => comment.articleId !== id,
    );
    this.dataService.comments.splice(
      0,
      this.dataService.comments.length,
      ...filteredComments,
    );
  }

  private findRecordById(id: string): Article {
    const article = this.dataService.articles.find((item) => item.id === id);

    if (!article) {
      throw new NotFoundException(`Article with id "${id}" not found`);
    }

    return article;
  }
}
