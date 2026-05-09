import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ReindexRequestDto {
  @ApiPropertyOptional({
    description: 'Index only published articles',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Selective article reindexing',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  articleIds?: string[];
}
