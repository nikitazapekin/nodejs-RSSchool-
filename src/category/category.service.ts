import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ListQueryDto } from '../common/dto/list-query.dto';
import { Category } from '../common/interfaces/category.interface';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CategoryModel } from '../common/models/category.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { InMemoryDataService } from '../database/in-memory-data.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  private static readonly sortableFields: Array<keyof CategoryModel & string> = [
    'name',
    'description',
  ];

  constructor(private readonly dataService: InMemoryDataService) {}

  findAll(query: ListQueryDto): Category[] | PaginatedResponse<Category> {
    const sortedCategories = sortItems(this.dataService.categories, {
      sortBy: query.sortBy,
      order: query.order,
      allowedSortFields: CategoryService.sortableFields,
    });

    return paginateItems(sortedCategories, {
      page: query.page,
      limit: query.limit,
    });
  }

  findOne(id: string): Category {
    return this.findRecordById(id);
  }

  create(dto: CreateCategoryDto): Category {
    const category: Category = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
    };

    this.dataService.categories.push(category);
    return category;
  }

  update(id: string, dto: UpdateCategoryDto): Category {
    const category = this.findRecordById(id);

    if (dto.name !== undefined) {
      category.name = dto.name;
    }

    if (dto.description !== undefined) {
      category.description = dto.description;
    }

    return category;
  }

  delete(id: string): void {
    const categoryIndex = this.dataService.categories.findIndex(
      (category) => category.id === id,
    );

    if (categoryIndex === -1) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    this.dataService.categories.splice(categoryIndex, 1);

    this.dataService.articles.forEach((article) => {
      if (article.categoryId === id) {
        article.categoryId = null;
        article.updatedAt = Date.now();
      }
    });
  }

  private findRecordById(id: string): Category {
    const category = this.dataService.categories.find((item) => item.id === id);

    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    return category;
  }
}
