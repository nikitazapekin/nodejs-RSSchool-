import { ApiProperty } from '@nestjs/swagger';

export class ReindexResponseModel {
  @ApiProperty()
  indexedArticles!: number;

  @ApiProperty()
  indexedChunks!: number;

  @ApiProperty()
  vectorCollection!: string;
}
