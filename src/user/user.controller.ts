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
import { PublicUser } from '../common/models/public-user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOkResponse({ type: PublicUser, isArray: true })
  findAll(@Query() query: ListQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: PublicUser })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): PublicUser {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: PublicUser })
  create(@Body() dto: CreateUserDto): PublicUser {
    return this.userService.create(dto);
  }

  @Put(':id')
  @ApiOkResponse({ type: PublicUser })
  updatePassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePasswordDto,
  ): PublicUser {
    return this.userService.updatePassword(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.userService.delete(id);
  }
}
