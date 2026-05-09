import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiModule } from '../ai/ai.module';
import { AiRateLimitInterceptor } from '../ai/interceptors/rate-limit.interceptor';
import { LoggerModule } from '../common/logger/logger.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RagChunkerService } from './services/rag-chunker.service';
import { RagConversationService } from './services/rag-conversation.service';
import { QdrantVectorStoreService } from './services/qdrant-vector-store.service';

@Module({
  imports: [ConfigModule, LoggerModule, AiModule],
  controllers: [RagController],
  providers: [
    RagService,
    RagChunkerService,
    RagConversationService,
    QdrantVectorStoreService,
    AiRateLimitInterceptor,
  ],
})
export class RagModule {}
