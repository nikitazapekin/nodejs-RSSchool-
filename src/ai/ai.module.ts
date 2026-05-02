import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { UsageTrackingService } from './services/usage-tracking.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, GeminiService, UsageTrackingService, PrismaService],
  exports: [AiService, GeminiService],
})
export class AiModule {}
