import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserRole as PrismaUserRole } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { PublicUser } from '../common/models/public-user.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { toPublicUser } from '../common/utils/user.util';
import { PrismaService } from '../database/prisma.service';
import { toUserRecord } from '../database/mappers';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UserService {
  private static readonly sortableFields: Array<keyof PublicUser & string> = [
    'login',
    'role',
    'createdAt',
    'updatedAt',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListQueryDto,
  ): Promise<PublicUser[] | PaginatedResponse<PublicUser>> {
    const users = (await this.prisma.user.findMany()).map((user) =>
      toPublicUser(toUserRecord(user)),
    );

    const sortedUsers = sortItems(users, {
      sortBy: query.sortBy,
      order: query.order,
      allowedSortFields: UserService.sortableFields,
    });

    return paginateItems(sortedUsers, {
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: string): Promise<PublicUser> {
    return toPublicUser(await this.findRecordById(id));
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        password: dto.password,
        role: (dto.role ?? UserRole.VIEWER) as PrismaUserRole,
      },
    });

    return toPublicUser(toUserRecord(user));
  }

  async updatePassword(id: string, dto: UpdatePasswordDto): Promise<PublicUser> {
    const user = await this.findRecordById(id);

    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is incorrect');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        password: dto.newPassword,
      },
    });

    return toPublicUser(toUserRecord(updatedUser));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with id "${id}" not found`);
      }

      await tx.user.delete({
        where: { id },
      });
    });
  }

  private async findRecordById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return toUserRecord(user);
  }
}
