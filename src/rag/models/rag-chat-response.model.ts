import { ApiProperty } from '@nestjs/swagger';

export class RagChatSourceModel {
  @ApiProperty({ format: 'uuid' })
  articleId!: string;

  @ApiProperty()
  articleTitle!: string;

  @ApiProperty()
  relevantChunk!: string;
}

export class RagChatResponseModel {
  @ApiProperty()
  answer!: string;

  @ApiProperty({ type: [RagChatSourceModel] })
  sources!: RagChatSourceModel[];

  @ApiProperty()
  conversationId!: string;
}
