import { ApiProperty } from '@nestjs/swagger';

import { UserRole } from '../enums/user-role.enum';

export class PublicUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  login!: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty()
  createdAt!: number;

  @ApiProperty()
  updatedAt!: number;
}
