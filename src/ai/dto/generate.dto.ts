import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({
    description: 'Optional session identifier for short-term conversation context',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;
}
