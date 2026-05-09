import { PublicUser } from '../models/public-user.model';
import { UserRecord } from '../interfaces/user-record.interface';

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
