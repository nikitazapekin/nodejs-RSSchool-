import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { SortOrder } from '../enums/sort-order.enum';

export class ListQueryDto {
  @ApiPropertyOptional({ minimum: 1, description: 'Page number for paginated responses' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, description: 'Page size for paginated responses' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Field name used for sorting' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SortOrder, enumName: 'SortOrder' })
  @IsOptional()
  @IsIn([SortOrder.ASC, SortOrder.DESC])
  order?: SortOrder;
}
