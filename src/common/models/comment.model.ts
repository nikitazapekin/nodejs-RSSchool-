import { ApiProperty } from '@nestjs/swagger';

export class CommentModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ format: 'uuid' })
  articleId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  authorId!: string | null;

  @ApiProperty()
  createdAt!: number;
}
