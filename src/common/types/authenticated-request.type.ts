import { Request } from 'express';

import { AuthUser } from '../../auth/interfaces/auth-user.interface';

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
