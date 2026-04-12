import { Injectable, NotFoundException } from '@nestjs/common';

import { ListQueryDto } from '../common/dto/list-query.dto';
import { Category } from '../common/interfaces/category.interface';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CategoryModel } from '../common/models/category.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { toCategoryRecord } from '../database/mappers';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  private static readonly sortableFields: Array<keyof CategoryModel & string> = [
    'name',
    'description',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListQueryDto,
  ): Promise<Category[] | PaginatedResponse<Category>> {
    const categories = (await this.prisma.category.findMany()).map(toCategoryRecord);
    const sortedCategories = sortItems(categories, {
      sortBy: query.sortBy,
      order: query.order,
      allowedSortFields: CategoryService.sortableFields,
    });

    return paginateItems(sortedCategories, {
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: string): Promise<Category> {
    return this.findRecordById(id);
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    return toCategoryRecord(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findRecordById(id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    return toCategoryRecord(category);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException(`Category with id "${id}" not found`);
      }

      await tx.category.delete({
        where: { id },
      });
    });
  }

  private async findRecordById(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    return toCategoryRecord(category);
  }
}
