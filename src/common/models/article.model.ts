import { ApiProperty } from '@nestjs/swagger';

import { ArticleStatus } from '../enums/article-status.enum';

export class ArticleModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ArticleStatus, enumName: 'ArticleStatus' })
  status!: ArticleStatus;

  @ApiProperty({ format: 'uuid', nullable: true })
  authorId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  categoryId!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  createdAt!: number;

  @ApiProperty()
  updatedAt!: number;
}
