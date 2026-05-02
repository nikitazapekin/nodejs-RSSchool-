import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { LoggerModule } from '../common/logger/logger.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { CacheService } from './services/cache.service';
import { ConversationMemoryService } from './services/conversation-memory.service';
import { UsageTrackingService } from './services/usage-tracking.service';

@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiService,
    CacheService,
    ConversationMemoryService,
    UsageTrackingService,
    PrismaService,
  ],
  exports: [AiService, GeminiService],
})
export class AiModule {}
