import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../database/prisma.service';
import { RagConversationService } from './rag-conversation.service';

function createPrismaMock() {
  const store = new Map<string, { id: string; messages: unknown }>();

  return {
    store,
    ragConversation: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => store.get(where.id) ?? null),
      upsert: vi.fn(async ({ where, create, update }: { where: { id: string }; create: { id: string; messages: unknown }; update: { messages: unknown } }) => {
        const existing = store.get(where.id);
        const record = existing
          ? { ...existing, messages: update.messages }
          : { id: create.id, messages: create.messages };
        store.set(where.id, record);
        return record;
      }),
    },
  };
}

describe('RagConversationService', () => {
  let service: RagConversationService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              const config: Record<string, string> = {
                RAG_CONVERSATION_MAX_MESSAGES: '3',
              };

              return config[key];
            }),
          },
        },
        {
          provide: RagConversationService,
          useFactory: (
            prismaService: PrismaService,
            configService: ConfigService,
          ) => new RagConversationService(prismaService, configService),
          inject: [PrismaService, ConfigService],
        },
      ],
    }).compile();

    service = moduleRef.get(RagConversationService);
  });

  it('stores only the latest configured messages', async () => {
    await service.appendConversationTurn('conv-1', 'Q1', 'A1');
    await service.appendConversationTurn('conv-1', 'Q2', 'A2');

    const history = await service.getHistory('conv-1');

    expect(history).toHaveLength(3);
    expect(history.map((message) => message.text)).toEqual(['A1', 'Q2', 'A2']);
  });

  it('throws when conversation history does not exist', async () => {
    await expect(service.getHistory('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
