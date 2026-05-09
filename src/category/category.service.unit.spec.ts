import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SortOrder } from '../common/enums/sort-order.enum';
import { PrismaService } from '../database/prisma.service';
import { CategoryService } from './category.service';

const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

function createPrismaMock() {
  return {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: CategoryService,
          useFactory: (prismaService: PrismaService) => new CategoryService(prismaService),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(CategoryService);
  });

  it('creates a category', async () => {
    prisma.category.create.mockResolvedValue({
      id: CATEGORY_ID,
      name: 'Backend',
      description: 'Server-side engineering',
    });

    await expect(
      service.create({ name: 'Backend', description: 'Server-side engineering' }),
    ).resolves.toEqual({
      id: CATEGORY_ID,
      name: 'Backend',
      description: 'Server-side engineering',
    });
  });

  it('updates a category partially', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: CATEGORY_ID,
      name: 'Old name',
      description: 'Old description',
    });
    prisma.category.update.mockResolvedValue({
      id: CATEGORY_ID,
      name: 'New name',
      description: 'Old description',
    });

    const result = await service.update(CATEGORY_ID, { name: 'New name' });
    expect(result.name).toBe('New name');
  });

  it('returns paginated sorted categories', async () => {
    prisma.category.findMany.mockResolvedValue([
      { id: '1', name: 'Zebra', description: 'Z' },
      { id: '2', name: 'Alpha', description: 'A' },
      { id: '3', name: 'Middle', description: 'M' },
    ]);

    const result = await service.findAll({
      sortBy: 'name',
      order: SortOrder.ASC,
      page: 1,
      limit: 2,
    });

    expect(result).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect('data' in result && result.data.map((item) => item.name)).toEqual([
      'Alpha',
      'Middle',
    ]);
  });

  it('throws when deleting a missing category', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(service.delete(CATEGORY_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a category by id', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: CATEGORY_ID,
      name: 'Backend',
      description: 'Server-side engineering',
    });

    await expect(service.findOne(CATEGORY_ID)).resolves.toEqual({
      id: CATEGORY_ID,
      name: 'Backend',
      description: 'Server-side engineering',
    });
  });

  it('deletes an existing category', async () => {
    prisma.category.findUnique.mockResolvedValue({ id: CATEGORY_ID });

    await expect(service.delete(CATEGORY_ID)).resolves.toBeUndefined();
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: CATEGORY_ID } });
  });

  it('throws when requested category does not exist', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(service.findOne(CATEGORY_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
