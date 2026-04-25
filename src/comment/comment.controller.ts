import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { ForbiddenError } from '../common/errors/forbidden.error';
import { CommentModel } from '../common/models/comment.model';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CommentService } from './comment.service';
import { CommentListQueryDto } from './dto/comment-list-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOkResponse({ type: CommentModel, isArray: true })
  findAll(@Query() query: CommentListQueryDto) {
    return this.commentService.findAll(query);
  }

  @Post()
  @ApiCreatedResponse({ type: CommentModel })
  create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateCommentDto) {
    if (currentUser.role === UserRole.VIEWER) {
      throw new ForbiddenError('Viewer role has read-only access');
    }

    return this.commentService.create(dto, currentUser);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async delete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', UuidValidationPipe) id: string,
  ): Promise<void> {
    if (currentUser.role === UserRole.VIEWER) {
      throw new ForbiddenError('Viewer role has read-only access');
    }

    await this.commentService.delete(id, currentUser);
  }
}
