import { plainToInstance } from 'class-transformer';
import { validate, validateOrReject } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { ArticleListQueryDto } from '../../article/dto/article-list-query.dto';
import { CreateArticleDto } from '../../article/dto/create-article.dto';
import { UpdateArticleDto } from '../../article/dto/update-article.dto';
import { AuthCredentialsDto } from '../../auth/dto/auth-credentials.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { CreateCategoryDto } from '../../category/dto/create-category.dto';
import { UpdateCategoryDto } from '../../category/dto/update-category.dto';
import { CreateCommentDto } from '../../comment/dto/create-comment.dto';
import { CommentListQueryDto } from '../../comment/dto/comment-list-query.dto';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { UpdatePasswordDto } from '../../user/dto/update-password.dto';
import { UpdateUserRoleDto } from '../../user/dto/update-user-role.dto';
import { ArticleStatus } from '../enums/article-status.enum';
import { SortOrder } from '../enums/sort-order.enum';
import { UserRole } from '../enums/user-role.enum';
import { ListQueryDto } from './list-query.dto';

describe('DTO validation', () => {
  it('fails when required auth fields are missing', async () => {
    const dto = plainToInstance(AuthCredentialsDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.property).sort()).toEqual(['login', 'password']);
  });

  it('fails for invalid article status enum values', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'Article',
      content: 'Content',
      status: 'invalid-status',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it('fails for malformed UUID values in article DTO', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'Article',
      content: 'Content',
      categoryId: 'bad-uuid',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'categoryId')).toBe(true);
  });

  it('passes for a valid payload', async () => {
    const dto = plainToInstance(RefreshTokenDto, {
      refreshToken: 'refresh-token',
    });

    await expect(validateOrReject(dto)).resolves.toBeUndefined();
  });

  it('passes for a valid article payload', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'Article',
      content: 'Content',
      status: ArticleStatus.DRAFT,
      authorId: '11111111-1111-4111-8111-111111111111',
      categoryId: '22222222-2222-4222-8222-222222222222',
      tags: ['nestjs'],
    });

    await expect(validateOrReject(dto)).resolves.toBeUndefined();
  });

  it('validates user and category DTOs', async () => {
    await expect(
      validateOrReject(
        plainToInstance(CreateUserDto, {
          login: 'admin01',
          password: 'secret123',
          role: UserRole.ADMIN,
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validateOrReject(
        plainToInstance(CreateCategoryDto, {
          name: 'Backend',
          description: 'Server-side engineering',
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(validateOrReject(plainToInstance(UpdateCategoryDto, {}))).resolves.toBeUndefined();
  });

  it('validates comment and query DTOs', async () => {
    await expect(
      validateOrReject(
        plainToInstance(CreateCommentDto, {
          content: 'Useful',
          articleId: '11111111-1111-4111-8111-111111111111',
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validateOrReject(
        plainToInstance(ListQueryDto, {
          page: 1,
          limit: 10,
          order: SortOrder.ASC,
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validateOrReject(
        plainToInstance(CommentListQueryDto, {
          articleId: '11111111-1111-4111-8111-111111111111',
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validateOrReject(
        plainToInstance(ArticleListQueryDto, {
          categoryId: '22222222-2222-4222-8222-222222222222',
          status: ArticleStatus.PUBLISHED,
          tag: 'nestjs',
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it('validates update DTOs and invalid enums', async () => {
    await expect(
      validateOrReject(
        plainToInstance(UpdatePasswordDto, {
          oldPassword: 'old',
          newPassword: 'new',
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validateOrReject(
        plainToInstance(UpdateArticleDto, {
          title: 'Updated',
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validate(
        plainToInstance(UpdateUserRoleDto, {
          role: 'owner',
        }),
      ),
    ).resolves.toSatisfy(
      (errors) => Array.isArray(errors) && errors.some((error) => error.property === 'role'),
    );
  });
});
