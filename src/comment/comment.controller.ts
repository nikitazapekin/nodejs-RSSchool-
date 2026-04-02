import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CommentModel } from '../common/models/comment.model';
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
  create(@Body() dto: CreateCommentDto) {
    return this.commentService.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.commentService.delete(id);
  }
}
