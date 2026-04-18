import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { ArticleModel } from '../common/models/article.model';
import { ArticleListQueryDto } from './dto/article-list-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleService } from './article.service';

@ApiTags('article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @ApiOkResponse({ type: ArticleModel, isArray: true })
  findAll(@Query() query: ArticleListQueryDto) {
    return this.articleService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ArticleModel })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.articleService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ArticleModel })
  create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateArticleDto) {
    if (currentUser.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewer role has read-only access');
    }

    return this.articleService.create(dto, currentUser);
  }

  @Put(':id')
  @ApiOkResponse({ type: ArticleModel })
  update(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    if (currentUser.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewer role has read-only access');
    }

    return this.articleService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async delete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    if (currentUser.role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewer role has read-only access');
    }

    await this.articleService.delete(id, currentUser);
  }
}
