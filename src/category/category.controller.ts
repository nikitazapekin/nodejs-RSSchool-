import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ListQueryDto } from '../common/dto/list-query.dto';
import { CategoryModel } from '../common/models/category.model';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOkResponse({ type: CategoryModel, isArray: true })
  findAll(@Query() query: ListQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryModel })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: CategoryModel })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  @ApiOkResponse({ type: CategoryModel })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.categoryService.delete(id);
  }
}
