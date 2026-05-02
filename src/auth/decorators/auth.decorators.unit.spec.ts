import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { UserRole } from '../../common/enums/user-role.enum';
import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { ROLES_KEY, Roles } from './roles.decorator';

class DecoratorFixture {
  @Public()
  publicRoute() {}

  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  roleProtectedRoute() {}
}

describe('auth decorators', () => {
  it('sets public metadata', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, DecoratorFixture.prototype.publicRoute),
    ).toBe(true);
  });

  it('sets roles metadata', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, DecoratorFixture.prototype.roleProtectedRoute),
    ).toEqual([UserRole.ADMIN, UserRole.EDITOR]);
  });
});
