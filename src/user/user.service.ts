import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ListQueryDto } from '../common/dto/list-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { UserRecord } from '../common/interfaces/user-record.interface';
import { PublicUser } from '../common/models/public-user.model';
import { paginateItems, sortItems } from '../common/utils/list-response.util';
import { toPublicUser } from '../common/utils/user.util';
import { InMemoryDataService } from '../database/in-memory-data.service';
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

  constructor(private readonly dataService: InMemoryDataService) {}

  findAll(query: ListQueryDto): PublicUser[] | PaginatedResponse<PublicUser> {
    const users = this.dataService.users.map(toPublicUser);
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

  findOne(id: string): PublicUser {
    return toPublicUser(this.findRecordById(id));
  }

  create(dto: CreateUserDto): PublicUser {
    const timestamp = Date.now();
    const user: UserRecord = {
      id: randomUUID(),
      login: dto.login,
      password: dto.password,
      role: dto.role ?? UserRole.VIEWER,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.dataService.users.push(user);
    return toPublicUser(user);
  }

  updatePassword(id: string, dto: UpdatePasswordDto): PublicUser {
    const user = this.findRecordById(id);

    if (user.password !== dto.oldPassword) {
      throw new ForbiddenException('Old password is incorrect');
    }

    user.password = dto.newPassword;
    user.updatedAt = Date.now();

    return toPublicUser(user);
  }

  delete(id: string): void {
    const userIndex = this.dataService.users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    this.dataService.users.splice(userIndex, 1);

    this.dataService.articles.forEach((article) => {
      if (article.authorId === id) {
        article.authorId = null;
        article.updatedAt = Date.now();
      }
    });

    const filteredComments = this.dataService.comments.filter(
      (comment) => comment.authorId !== id,
    );
    this.dataService.comments.splice(
      0,
      this.dataService.comments.length,
      ...filteredComments,
    );
  }

  private findRecordById(id: string): UserRecord {
    const user = this.dataService.users.find((item) => item.id === id);

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return user;
  }
}
