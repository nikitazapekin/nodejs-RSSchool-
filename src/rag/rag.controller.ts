import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AiRateLimitInterceptor } from '../ai/interceptors/rate-limit.interceptor';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { RagChatRequestDto } from './dto/rag-chat-request.dto';
import { RagSearchRequestDto } from './dto/rag-search-request.dto';
import { ReindexRequestDto } from './dto/reindex-request.dto';
import { RagChatResponseModel } from './models/rag-chat-response.model';
import { RagHistoryResponseModel } from './models/rag-history-response.model';
import { RagSearchResponseModel } from './models/rag-search-response.model';
import { ReindexResponseModel } from './models/reindex-response.model';
import { RagService } from './rag.service';

@ApiTags('AI RAG')
@ApiBearerAuth()
@UseInterceptors(AiRateLimitInterceptor)
@Controller('ai/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index Knowledge Hub articles into the vector store' })
  @ApiOkResponse({ type: ReindexResponseModel })
  @ApiServiceUnavailableResponse({ description: 'Gemini or vector DB unavailable' })
  reindex(@Body() dto: ReindexRequestDto) {
    return this.ragService.reindex(dto);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform semantic search over indexed Knowledge Hub chunks' })
  @ApiOkResponse({ type: RagSearchResponseModel })
  @ApiBadRequestResponse({ description: 'Query is required' })
  @ApiServiceUnavailableResponse({ description: 'Gemini or vector DB unavailable' })
  search(@Body() dto: RagSearchRequestDto) {
    return this.ragService.search(dto);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a grounded question against indexed Knowledge Hub content' })
  @ApiOkResponse({ type: RagChatResponseModel })
  @ApiBadRequestResponse({ description: 'Question is required' })
  @ApiServiceUnavailableResponse({ description: 'Gemini or vector DB unavailable' })
  chat(@Body() dto: RagChatRequestDto) {
    return this.ragService.chat(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all indexed chunks belonging to an article' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Article index entries not found' })
  @ApiServiceUnavailableResponse({ description: 'Vector DB unavailable' })
  async deleteArticleIndex(
    @Param('articleId', UuidValidationPipe) articleId: string,
  ): Promise<void> {
    await this.ragService.deleteIndexedArticle(articleId);
  }

  @Get('chat/:conversationId/history')
  @ApiOperation({ summary: 'Inspect stored RAG conversation history' })
  @ApiOkResponse({ type: RagHistoryResponseModel })
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  getHistory(@Param('conversationId') conversationId: string) {
    return this.ragService.getConversationHistory(conversationId);
  }
}
