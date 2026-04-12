import { UserRole } from '../enums/user-role.enum';

export interface UserRecord {
  id: string;
  login: string;
  password: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}
