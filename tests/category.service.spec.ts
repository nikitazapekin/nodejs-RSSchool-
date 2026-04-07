import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { InMemoryDataService } from '../src/database/in-memory-data.service';
import { CategoryService } from '../src/category/category.service';
import { SortOrder } from '../src/common/enums/sort-order.enum';

describe('CategoryService', () => {
  let service: CategoryService;
  let dataService: InMemoryDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryService, InMemoryDataService],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    dataService = module.get<InMemoryDataService>(InMemoryDataService);
  });

  it('should create a category', () => {
    const category = service.create({
      name: 'Technology',
      description: 'Tech related categories',
    });

    assert.ok(category);
    assert.equal(category.name, 'Technology');
    assert.equal(category.description, 'Tech related categories');
    assert.ok(category.id);
  });

  it('should find one category by id', () => {
    const created = service.create({ name: 'Science', description: 'Science topics' });

    const found = service.findOne(created.id);

    assert.equal(found.id, created.id);
    assert.equal(found.name, 'Science');
  });

  it('should throw NotFoundException when finding non-existent category', () => {
    assert.throws(() => service.findOne(randomUUID()), NotFoundException);
  });

  it('should find all categories', () => {
    service.create({ name: 'Cat1', description: 'Desc1' });
    service.create({ name: 'Cat2', description: 'Desc2' });

    const categories = service.findAll({});

    assert.equal(Array.isArray(categories), true);
    assert.equal((categories as any[]).length, 2);
  });

  it('should update a category', () => {
    const category = service.create({ name: 'Old Name', description: 'Old Desc' });

    const updated = service.update(category.id, {
      name: 'New Name',
      description: 'New Description',
    });

    assert.equal(updated.name, 'New Name');
    assert.equal(updated.description, 'New Description');
  });

  it('should partially update a category (only name)', () => {
    const category = service.create({ name: 'Old Name', description: 'Keep This' });

    const updated = service.update(category.id, { name: 'Updated Name' });

    assert.equal(updated.name, 'Updated Name');
    assert.equal(updated.description, 'Keep This');
  });

  it('should throw NotFoundException when updating non-existent category', () => {
    assert.throws(
      () => service.update(randomUUID(), { name: 'New Name' }),
      NotFoundException,
    );
  });

  it('should delete category and cascade nullify categoryId in related articles', () => {
    const category = service.create({ name: 'To Delete', description: 'Desc' });
    const categoryId = category.id;

 
    dataService.articles.push({
      id: randomUUID(),
      title: 'Linked Article',
      content: 'Content',
      status: 'draft' as any,
      authorId: null,
      categoryId,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    service.delete(categoryId);
 
    assert.equal(dataService.categories.length, 0);
 
    assert.equal(dataService.articles[0].categoryId, null);
    assert.ok(dataService.articles[0].updatedAt);
  });

  it('should throw NotFoundException when deleting non-existent category', () => {
    assert.throws(() => service.delete(randomUUID()), NotFoundException);
  });

  it('should support sorting categories by name', () => {
    service.create({ name: 'Zebra', description: 'Z' });
    service.create({ name: 'Alpha', description: 'A' });
    service.create({ name: 'Middle', description: 'M' });

    const asc = service.findAll({ sortBy: 'name', order: SortOrder.ASC });
    assert.equal((asc as any[])[0].name, 'Alpha');
    assert.equal((asc as any[])[2].name, 'Zebra');

    const desc = service.findAll({ sortBy: 'name', order: SortOrder.DESC });
    assert.equal((desc as any[])[0].name, 'Zebra');
  });

  it('should support pagination for categories', () => {
    for (let i = 0; i < 5; i++) {
      service.create({ name: `Category ${i}`, description: `Desc ${i}` });
    }

    const result = service.findAll({ page: 2, limit: 2 } as any);

    assert.equal((result as any).total, 5);
    assert.equal((result as any).page, 2);
    assert.equal((result as any).data.length, 2);
  });
});
