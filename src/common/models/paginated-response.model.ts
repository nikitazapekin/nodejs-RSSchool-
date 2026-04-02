import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMetaModel {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
