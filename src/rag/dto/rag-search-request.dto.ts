import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Matches,
  Min,
} from 'class-validator';

import { ArticleStatus } from '../../common/enums/article-status.enum';

export class RagSearchRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'query should not be empty' })
  query!: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({ enum: ArticleStatus, enumName: 'ArticleStatus' })
  @IsOptional()
  @IsEnum(ArticleStatus)
  articleStatus?: ArticleStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
