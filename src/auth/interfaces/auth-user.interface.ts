import { UserRole } from '../../common/enums/user-role.enum';

export interface AuthUser {
  userId: string;
  login: string;
  role: UserRole;
}
