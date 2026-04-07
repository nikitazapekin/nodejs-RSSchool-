import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { InMemoryDataService } from '../src/database/in-memory-data.service';
import { CommentService } from '../src/comment/comment.service';
import { ArticleService } from '../src/article/article.service';
import { SortOrder } from '../src/common/enums/sort-order.enum';

describe('CommentService', () => {
  let commentService: CommentService;
  let articleService: ArticleService;
  let dataService: InMemoryDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentService, ArticleService, InMemoryDataService],
    }).compile();

    commentService = module.get<CommentService>(CommentService);
    articleService = module.get<ArticleService>(ArticleService);
    dataService = module.get<InMemoryDataService>(InMemoryDataService);
  });

  it('should create a comment for an existing article', () => {
    const article = articleService.create({ title: 'Test Article', content: 'Content' });

    const comment = commentService.create({
      content: 'Great article!',
      articleId: article.id,
    });

    assert.ok(comment);
    assert.equal(comment.content, 'Great article!');
    assert.equal(comment.articleId, article.id);
    assert.equal(comment.authorId, null);
    assert.ok(comment.id);
    assert.ok(comment.createdAt);
  });

  it('should create a comment with an authorId', () => {
    const article = articleService.create({ title: 'Test Article', content: 'Content' });
    const authorId = randomUUID();

    const comment = commentService.create({
      content: 'Nice work!',
      articleId: article.id,
      authorId,
    });

    assert.equal(comment.authorId, authorId);
  });

  it('should throw UnprocessableEntityException when creating comment for non-existent article', () => {
    const fakeArticleId = randomUUID();

    assert.throws(
      () =>
        commentService.create({
          content: 'Orphan comment',
          articleId: fakeArticleId,
        }),
      UnprocessableEntityException,
    );
  });

  it('should list comments for an article', () => {
    const article = articleService.create({ title: 'Test Article', content: 'Content' });

    commentService.create({ content: 'Comment 1', articleId: article.id });
    commentService.create({ content: 'Comment 2', articleId: article.id });
    commentService.create({ content: 'Comment 3', articleId: article.id });

    const comments = commentService.findAll({ articleId: article.id });

    assert.equal(Array.isArray(comments), true);
    assert.equal((comments as any[]).length, 3);
  });

  it('should return only comments for the specified article', () => {
    const article1 = articleService.create({ title: 'Article 1', content: 'Content' });
    const article2 = articleService.create({ title: 'Article 2', content: 'Content' });

    commentService.create({ content: 'Comment for 1', articleId: article1.id });
    commentService.create({ content: 'Comment for 2', articleId: article2.id });

    const commentsForArticle1 = commentService.findAll({ articleId: article1.id });

    assert.equal((commentsForArticle1 as any[]).length, 1);
    assert.equal((commentsForArticle1 as any[])[0].content, 'Comment for 1');
  });

  it('should delete a comment', () => {
    const article = articleService.create({ title: 'Test Article', content: 'Content' });
    const comment = commentService.create({ content: 'To delete', articleId: article.id });

    commentService.delete(comment.id);

    assert.equal(dataService.comments.length, 0);
  });

  it('should throw NotFoundException when deleting non-existent comment', () => {
    assert.throws(() => commentService.delete(randomUUID()), NotFoundException);
  });

  it('should support sorting comments by createdAt', () => {
    const article = articleService.create({ title: 'Test Article', content: 'Content' });

  
    dataService.comments.push(
      { id: randomUUID(), content: 'First', articleId: article.id, authorId: null, createdAt: 1000 },
      { id: randomUUID(), content: 'Second', articleId: article.id, authorId: null, createdAt: 2000 },
      { id: randomUUID(), content: 'Third', articleId: article.id, authorId: null, createdAt: 3000 },
    );

    const asc = commentService.findAll({ articleId: article.id, sortBy: 'createdAt', order: SortOrder.ASC } as any);
    assert.equal((asc as any[])[0].content, 'First');
    assert.equal((asc as any[])[2].content, 'Third');

    const desc = commentService.findAll({ articleId: article.id, sortBy: 'createdAt', order: SortOrder.DESC } as any);
    assert.equal((desc as any[])[0].content, 'Third');
  });

  it('should support pagination for comments', () => {
    const article = articleService.create({ title: 'Test Article', content: 'Content' });

    for (let i = 0; i < 5; i++) {
      commentService.create({ content: `Comment ${i}`, articleId: article.id });
    }

    const result = commentService.findAll({ articleId: article.id, page: 1, limit: 2 } as any);

    assert.equal((result as any).total, 5);
    assert.equal((result as any).page, 1);
    assert.equal((result as any).limit, 2);
    assert.equal((result as any).data.length, 2);
  });
});
