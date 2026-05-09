import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RagConversationMessage } from '../interfaces/rag.interface';

@Injectable()
export class RagConversationService {
  private readonly maxMessages: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.maxMessages = this.resolveMaxMessages();
  }

  async getHistory(conversationId: string): Promise<RagConversationMessage[]> {
    const conversation = await this.prisma.ragConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation "${conversationId}" not found`);
    }

    return this.parseMessages(conversation.messages);
  }

  async getContext(conversationId?: string): Promise<RagConversationMessage[]> {
    if (!conversationId) {
      return [];
    }

    const conversation = await this.prisma.ragConversation.findUnique({
      where: { id: conversationId },
    });

    return conversation ? this.parseMessages(conversation.messages) : [];
  }

  async appendConversationTurn(
    conversationId: string,
    question: string,
    answer: string,
  ): Promise<void> {
    const existingMessages = await this.getContext(conversationId);
    const timestamp = new Date().toISOString();
    const nextMessages = [
      ...existingMessages,
      { role: 'user' as const, text: question, createdAt: timestamp },
      { role: 'assistant' as const, text: answer, createdAt: timestamp },
    ].slice(-this.maxMessages);

    await this.prisma.ragConversation.upsert({
      where: { id: conversationId },
      update: {
        messages: nextMessages as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: conversationId,
        messages: nextMessages as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private parseMessages(value: Prisma.JsonValue): RagConversationMessage[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const record = item as Record<string, unknown>;
      const role = record.role;
      const text = record.text;
      const createdAt = record.createdAt;

      if (
        (role === 'user' || role === 'assistant') &&
        typeof text === 'string' &&
        typeof createdAt === 'string'
      ) {
        return [
          {
            role,
            text,
            createdAt,
          },
        ];
      }

      return [];
    });
  }

  private resolveMaxMessages(): number {
    const raw = this.configService.get<string>('RAG_CONVERSATION_MAX_MESSAGES');
    const value = raw ? Number(raw) : 20;

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('RAG_CONVERSATION_MAX_MESSAGES must be a positive number');
    }

    return Math.floor(value);
  }
}
