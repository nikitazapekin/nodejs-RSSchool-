import { ApiProperty } from '@nestjs/swagger';

export class RagHistoryMessageModel {
  @ApiProperty({ enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @ApiProperty()
  text!: string;

  @ApiProperty()
  createdAt!: string;
}

export class RagHistoryResponseModel {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ type: [RagHistoryMessageModel] })
  messages!: RagHistoryMessageModel[];
}
