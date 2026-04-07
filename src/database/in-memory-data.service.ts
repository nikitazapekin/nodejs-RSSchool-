import { Injectable } from '@nestjs/common';

import { Article } from '../common/interfaces/article.interface';
import { Category } from '../common/interfaces/category.interface';
import { Comment } from '../common/interfaces/comment.interface';
import { UserRecord } from '../common/interfaces/user-record.interface';

@Injectable()
export class InMemoryDataService {
  readonly users: UserRecord[] = [];

  readonly articles: Article[] = [];

  readonly categories: Category[] = [];

  readonly comments: Comment[] = [];
}
