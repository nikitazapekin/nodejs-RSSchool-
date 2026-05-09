import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NotFoundException } from '@nestjs/common';

import { SortOrder } from '../src/common/enums/sort-order.enum';
import { CategoryService } from '../src/category/category.service';

const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

function createCategoryService() {
  const prisma = {
    category: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async ({ data }: any) => ({
        id: CATEGORY_ID,
        name: data.name,
        description: data.description,
      }),
      update: async ({ data }: any) => ({
        id: CATEGORY_ID,
        name: data.name ?? 'Backend',
        description: data.description ?? 'Server-side engineering',
      }),
      delete: async () => undefined,
    },
    $transaction: async (callback: any) => callback(prisma),
  } as any;

  return {
    prisma,
    service: new CategoryService(prisma),
  };
}

describe('CategoryService', () => {
  it('creates a category', async () => {
    const { service } = createCategoryService();

    const category = await service.create({
      name: 'Backend',
      description: 'Server-side engineering',
    });

    assert.equal(category.id, CATEGORY_ID);
    assert.equal(category.name, 'Backend');
    assert.equal(category.description, 'Server-side engineering');
  });

  it('updates a category partially', async () => {
    const { service, prisma } = createCategoryService();

    prisma.category.findUnique = async () => ({
      id: CATEGORY_ID,
      name: 'Old name',
      description: 'Old description',
    });

    const category = await service.update(CATEGORY_ID, {
      name: 'New name',
    });

    assert.equal(category.name, 'New name');
    assert.equal(category.description, 'Server-side engineering');
  });

  it('returns paginated categories sorted by name', async () => {
    const { service, prisma } = createCategoryService();

    prisma.category.findMany = async () => [
      { id: '1', name: 'Zebra', description: 'Z' },
      { id: '2', name: 'Alpha', description: 'A' },
      { id: '3', name: 'Middle', description: 'M' },
    ];

    const result = await service.findAll({
      sortBy: 'name',
      order: SortOrder.ASC,
      page: 1,
      limit: 2,
    });

    assert.equal((result as any).total, 3);
    assert.equal((result as any).data[0].name, 'Alpha');
    assert.equal((result as any).data[1].name, 'Middle');
  });

  it('throws NotFoundException when deleting a missing category', async () => {
    const { service } = createCategoryService();

    await assert.rejects(service.delete(CATEGORY_ID), NotFoundException);
  });
});
