import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prompt!: string;
}
