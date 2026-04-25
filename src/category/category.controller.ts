import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
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

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ForbiddenError } from '../common/errors/forbidden.error';
import { CategoryModel } from '../common/models/category.model';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
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
  findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: CategoryModel })
  create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateCategoryDto) {
    this.ensureAdmin(currentUser);
    return this.categoryService.create(dto);
  }

  @Put(':id')
  @ApiOkResponse({ type: CategoryModel })
  update(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    this.ensureAdmin(currentUser);
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async delete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', UuidValidationPipe) id: string,
  ): Promise<void> {
    this.ensureAdmin(currentUser);
    await this.categoryService.delete(id);
  }

  private ensureAdmin(user: AuthUser): void {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Admin role is required');
    }
  }
}
