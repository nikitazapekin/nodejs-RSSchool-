import { ApiProperty } from '@nestjs/swagger';

export class CategoryModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;
}
