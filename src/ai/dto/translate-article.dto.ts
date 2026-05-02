import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TranslateArticleDto {
  @ApiProperty()
  @IsString()
  targetLanguage!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceLanguage?: string;
}
