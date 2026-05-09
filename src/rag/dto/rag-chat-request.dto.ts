import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RagChatRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'question should not be empty' })
  question!: string;

  @ApiPropertyOptional({
    description: 'Existing conversation identifier',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
