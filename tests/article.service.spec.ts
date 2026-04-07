import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { InMemoryDataService } from '../src/database/in-memory-data.service';
import { ArticleService } from '../src/article/article.service';
import { ArticleStatus } from '../src/common/enums/article-status.enum';
import { SortOrder } from '../src/common/enums/sort-order.enum';

describe('ArticleService', () => {
  let service: ArticleService;
  let dataService: InMemoryDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticleService, InMemoryDataService],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    dataService = module.get<InMemoryDataService>(InMemoryDataService);
  });

  it('should create an article with default draft status when status is not specified', () => {
    const article = service.create({
      title: 'My Article',
      content: 'Article content here',
    });

    assert.ok(article);
    assert.equal(article.title, 'My Article');
    assert.equal(article.content, 'Article content here');
    assert.equal(article.status, ArticleStatus.DRAFT);
    assert.equal(article.authorId, null);
    assert.equal(article.categoryId, null);
    assert.deepEqual(article.tags, []);
    assert.ok(article.id);
    assert.ok(article.createdAt);
    assert.ok(article.updatedAt);
  });

  it('should create an article with specified status and optional fields', () => {
    const authorId = randomUUID();
    const categoryId = randomUUID();

    const article = service.create({
      title: 'Published Article',
      content: 'Content',
      status: ArticleStatus.PUBLISHED,
      authorId,
      categoryId,
      tags: ['nestjs', 'api'],
    });

    assert.equal(article.status, ArticleStatus.PUBLISHED);
    assert.equal(article.authorId, authorId);
    assert.equal(article.categoryId, categoryId);
    assert.deepEqual(article.tags, ['nestjs', 'api']);
  });

  it('should find one article by id', () => {
    const created = service.create({ title: 'Find Me', content: 'Content' });

    const found = service.findOne(created.id);

    assert.equal(found.id, created.id);
    assert.equal(found.title, 'Find Me');
  });

  it('should throw NotFoundException when finding non-existent article', () => {
    assert.throws(() => service.findOne(randomUUID()), NotFoundException);
  });

  it('should filter articles by status', () => {
    service.create({ title: 'Draft Article', content: 'Content', status: ArticleStatus.DRAFT });
    service.create({ title: 'Published Article', content: 'Content', status: ArticleStatus.PUBLISHED });
    service.create({ title: 'Archived Article', content: 'Content', status: ArticleStatus.ARCHIVED });

    const publishedArticles = service.findAll({ status: ArticleStatus.PUBLISHED });

    assert.equal(Array.isArray(publishedArticles), true);
    assert.equal((publishedArticles as any[]).length, 1);
    assert.equal((publishedArticles as any[])[0].title, 'Published Article');
  });

  it('should filter articles by tag', () => {
    service.create({ title: 'Article 1', content: 'Content', tags: ['nestjs', 'typescript'] });
    service.create({ title: 'Article 2', content: 'Content', tags: ['python', 'django'] });
    service.create({ title: 'Article 3', content: 'Content', tags: ['nestjs', 'graphql'] });

    const nestjsArticles = service.findAll({ tag: 'nestjs' });

    assert.equal((nestjsArticles as any[]).length, 2);
  });

  it('should filter articles by categoryId', () => {
    const cat1 = randomUUID();
    const cat2 = randomUUID();

    service.create({ title: 'Article 1', content: 'Content', categoryId: cat1 });
    service.create({ title: 'Article 2', content: 'Content', categoryId: cat2 });
    service.create({ title: 'Article 3', content: 'Content', categoryId: cat1 });

    const filtered = service.findAll({ categoryId: cat1 });

    assert.equal((filtered as any[]).length, 2);
  });

  it('should update an article', () => {
    const article = service.create({ title: 'Old Title', content: 'Old Content' });

    const updated = service.update(article.id, {
      title: 'New Title',
      status: ArticleStatus.PUBLISHED,
    });

    assert.equal(updated.title, 'New Title');
    assert.equal(updated.status, ArticleStatus.PUBLISHED);
    assert.equal(updated.content, 'Old Content');  
    assert.ok(updated.updatedAt >= article.updatedAt);
  });

  it('should throw NotFoundException when updating non-existent article', () => {
    assert.throws(
      () => service.update(randomUUID(), { title: 'New Title' }),
      NotFoundException,
    );
  });

  it('should delete article and cascade delete associated comments', () => {
    const article = service.create({ title: 'To Delete', content: 'Content' });
    const articleId = article.id;
 
    dataService.comments.push(
      { id: randomUUID(), content: 'Comment 1', articleId, authorId: null, createdAt: Date.now() },
      { id: randomUUID(), content: 'Comment 2', articleId, authorId: null, createdAt: Date.now() },
    );
 
    const otherArticleId = randomUUID();
    dataService.comments.push({
      id: randomUUID(),
      content: 'Other Comment',
      articleId: otherArticleId,
      authorId: null,
      createdAt: Date.now(),
    });

    service.delete(articleId);
 
    assert.equal(dataService.articles.length, 0);
 
    assert.equal(dataService.comments.length, 1);
    assert.equal(dataService.comments[0].articleId, otherArticleId);
  });

  it('should throw NotFoundException when deleting non-existent article', () => {
    assert.throws(() => service.delete(randomUUID()), NotFoundException);
  });

  it('should support sorting articles by title', () => {
    service.create({ title: 'Charlie', content: 'Content' });
    service.create({ title: 'Alice', content: 'Content' });
    service.create({ title: 'Bob', content: 'Content' });

    const asc = service.findAll({ sortBy: 'title', order: SortOrder.ASC });
    assert.equal((asc as any[])[0].title, 'Alice');
    assert.equal((asc as any[])[2].title, 'Charlie');

    const desc = service.findAll({ sortBy: 'title', order: SortOrder.DESC });
    assert.equal((desc as any[])[0].title, 'Charlie');
  });

  it('should support pagination for articles', () => {
    for (let i = 0; i < 5; i++) {
      service.create({ title: `Article ${i}`, content: 'Content' });
    }

    const result = service.findAll({ page: 1, limit: 2 } as any);

    assert.equal((result as any).total, 5);
    assert.equal((result as any).page, 1);
    assert.equal((result as any).limit, 2);
    assert.equal((result as any).data.length, 2);
  });
});
