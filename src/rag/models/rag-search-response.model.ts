import { ApiProperty } from '@nestjs/swagger';

export class RagSearchResultModel {
  @ApiProperty({ format: 'uuid' })
  articleId!: string;

  @ApiProperty()
  articleTitle!: string;

  @ApiProperty()
  chunk!: string;

  @ApiProperty()
  similarity!: number;
}

export class RagSearchResponseModel {
  @ApiProperty({ type: [RagSearchResultModel] })
  results!: RagSearchResultModel[];
}
