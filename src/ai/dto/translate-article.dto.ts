import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranslateArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetLanguage!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceLanguage?: string;
}
