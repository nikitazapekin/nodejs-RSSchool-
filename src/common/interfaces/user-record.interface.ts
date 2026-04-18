import { UserRole } from '../enums/user-role.enum';

export interface UserRecord {
  id: string;
  login: string;
  password: string;
  refreshTokenHash: string | null;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}
