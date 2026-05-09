import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthUser } from '../interfaces/auth-user.interface';
import { AuthenticatedRequest } from '../../common/types/authenticated-request.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
