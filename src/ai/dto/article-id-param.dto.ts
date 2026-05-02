import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ArticleIdParamDto {
  @ApiProperty({
    description: 'Article identifier',
    format: 'uuid',
  })
  @IsUUID('4')
  articleId!: string;
}
