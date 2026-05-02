import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum SummaryLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  DETAILED = 'detailed',
}

export class SummarizeArticleDto {
  @ApiPropertyOptional({ enum: SummaryLength, default: SummaryLength.MEDIUM })
  @IsOptional()
  @IsEnum(SummaryLength)
  maxLength?: SummaryLength;
}
