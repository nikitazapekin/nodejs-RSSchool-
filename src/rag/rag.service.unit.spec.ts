import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeminiService } from '../ai/gemini.service';
import { AppLogger } from '../common/logger/app-logger.service';
import { PrismaService } from '../database/prisma.service';
import { RagService } from './rag.service';
import { RagChunkerService } from './services/rag-chunker.service';
import { RagConversationService } from './services/rag-conversation.service';
import { QdrantVectorStoreService } from './services/qdrant-vector-store.service';

function createLoggerMock() {
  return {
    logError: vi.fn(),
  };
}

describe('RagService', () => {
  let service: RagService;
  let gemini: {
    embedQuery: ReturnType<typeof vi.fn>;
    generateText: ReturnType<typeof vi.fn>;
  };
  let vectorStore: {
    search: ReturnType<typeof vi.fn>;
  };
  let conversations: {
    getContext: ReturnType<typeof vi.fn>;
    appendConversationTurn: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    gemini = {
      embedQuery: vi.fn(),
      generateText: vi.fn(),
    };
    vectorStore = {
      search: vi.fn(),
    };
    conversations = {
      getContext: vi.fn(),
      appendConversationTurn: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: GeminiService,
          useValue: gemini,
        },
        {
          provide: RagChunkerService,
          useValue: {},
        },
        {
          provide: QdrantVectorStoreService,
          useValue: vectorStore,
        },
        {
          provide: RagConversationService,
          useValue: conversations,
        },
        {
          provide: AppLogger,
          useValue: createLoggerMock(),
        },
        {
          provide: RagService,
          useFactory: (
            prismaService: PrismaService,
            geminiService: GeminiService,
            chunkerService: RagChunkerService,
            vectorStoreService: QdrantVectorStoreService,
            conversationService: RagConversationService,
            logger: AppLogger,
          ) =>
            new RagService(
              prismaService,
              geminiService,
              chunkerService,
              vectorStoreService,
              conversationService,
              logger,
            ),
          inject: [
            PrismaService,
            GeminiService,
            RagChunkerService,
            QdrantVectorStoreService,
            RagConversationService,
            AppLogger,
          ],
        },
      ],
    }).compile();

    service = moduleRef.get(RagService);
  });

  it('returns grounded sources for chat responses', async () => {
    gemini.embedQuery.mockResolvedValue([0.1, 0.2]);
    gemini.generateText.mockResolvedValue({ text: 'Grounded answer' });
    conversations.getContext.mockResolvedValue([
      { role: 'user', text: 'Previous question', createdAt: '2026-05-09T12:00:00.000Z' },
    ]);
    vectorStore.search.mockResolvedValue([
      {
        id: 'point-1',
        score: 0.8,
        payload: {
          articleId: 'article-1',
          articleTitle: 'Moderation Workflow',
          chunkIndex: 0,
          chunkText: 'Editors can publish drafts after review.',
          contentForEmbedding: 'Article title: Moderation Workflow\n\nEditors can publish drafts after review.',
          status: 'published',
          categoryId: null,
          tags: ['workflow'],
          updatedAt: '2026-05-09T12:00:00.000Z',
        },
      },
    ]);

    const result = await service.chat({ question: 'Who publishes drafts?' });

    expect(result.answer).toBe('Grounded answer');
    expect(result.sources).toEqual([
      {
        articleId: 'article-1',
        articleTitle: 'Moderation Workflow',
        relevantChunk: 'Editors can publish drafts after review.',
      },
    ]);
    expect(conversations.appendConversationTurn).toHaveBeenCalled();
  });

  it('maps Gemini failures to 503 for search', async () => {
    gemini.embedQuery.mockRejectedValue(new Error('network down'));

    await expect(service.search({ query: 'test' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
