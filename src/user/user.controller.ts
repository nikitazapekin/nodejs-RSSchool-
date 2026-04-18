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
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PublicUser> {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: PublicUser })
  create(
    @CurrentUser() currentUser: AuthUser,
    @Body() dto: CreateUserDto,
  ): Promise<PublicUser> {
    this.ensureAdmin(currentUser);
    return this.userService.create(dto);
  }

  @Put(':id')
  @ApiOkResponse({ type: PublicUser })
  updatePassword(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePasswordDto,
  ): Promise<PublicUser> {
    this.ensureAdmin(currentUser);
    return this.userService.updatePassword(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async delete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    this.ensureAdmin(currentUser);
    await this.userService.delete(id);
  }

  private ensureAdmin(user: AuthUser): void {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin role is required');
    }
  }
}
