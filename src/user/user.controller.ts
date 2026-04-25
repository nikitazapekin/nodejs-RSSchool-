import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { PublicUser } from '../common/models/public-user.model';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
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
    @Param('id', UuidValidationPipe) id: string,
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
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdatePasswordDto,
  ): Promise<PublicUser> {
    this.ensureAdmin(currentUser);
    return this.userService.updatePassword(id, dto);
  }

  @Put(':id/role')
  @ApiOkResponse({ type: PublicUser })
  updateRole(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<PublicUser> {
    this.ensureAdmin(currentUser);
    return this.userService.updateRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async delete(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', UuidValidationPipe) id: string,
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
