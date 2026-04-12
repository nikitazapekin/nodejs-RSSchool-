import {
  Article,
  Category,
  Comment,
  User,
} from '@prisma/client';

import { Article as ArticleRecord } from '../common/interfaces/article.interface';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { Category as CategoryRecord } from '../common/interfaces/category.interface';
import { Comment as CommentRecord } from '../common/interfaces/comment.interface';
import { UserRecord } from '../common/interfaces/user-record.interface';
import { UserRole } from '../common/enums/user-role.enum';

type ArticleTagRecord = {
  name: string;
};

export function toUserRecord(user: User): UserRecord {
  return {
    id: user.id,
    login: user.login,
    password: user.password,
    role: user.role as UserRole,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };
}

export function toCategoryRecord(category: Category): CategoryRecord {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
  };
}

export function toCommentRecord(comment: Comment): CommentRecord {
  return {
    id: comment.id,
    content: comment.content,
    articleId: comment.articleId,
    authorId: comment.authorId,
    createdAt: comment.createdAt.getTime(),
  };
}

export function toArticleRecord(
  article: Article & { tags: ArticleTagRecord[] },
): ArticleRecord {
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    status: article.status as ArticleStatus,
    authorId: article.authorId,
    categoryId: article.categoryId,
    tags: article.tags.map((tag) => tag.name),
    createdAt: article.createdAt.getTime(),
    updatedAt: article.updatedAt.getTime(),
  };
}
