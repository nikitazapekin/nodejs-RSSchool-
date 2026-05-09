import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { ArticleStatus } from '../../common/enums/article-status.enum';
import { RagChunkerService } from './rag-chunker.service';

function createService(chunkSize = '30', chunkOverlap = '10') {
  const configService = {
    get: vi.fn((key: string) => {
      const config: Record<string, string> = {
        RAG_CHUNK_SIZE: chunkSize,
        RAG_CHUNK_OVERLAP: chunkOverlap,
      };

      return config[key];
    }),
  } as unknown as ConfigService;

  return new RagChunkerService(configService);
}

describe('RagChunkerService', () => {
  it('splits article content deterministically with stable ids', () => {
    const service = createService();
    const article = {
      id: 'article-1',
      title: 'Chunking',
      content:
        'First sentence about NestJS. Second sentence about Prisma. Third sentence about Qdrant. Fourth sentence about Gemini.',
      status: ArticleStatus.PUBLISHED,
      categoryId: null,
      tags: ['nestjs', 'rag'],
      updatedAt: new Date('2026-05-09T12:00:00.000Z'),
    };

    const firstRun = service.splitArticle(article);
    const secondRun = service.splitArticle(article);

    expect(firstRun.length).toBeGreaterThan(1);
    expect(firstRun.map((chunk) => chunk.id)).toEqual(secondRun.map((chunk) => chunk.id));
    expect(firstRun.map((chunk) => chunk.chunkText)).toEqual(
      secondRun.map((chunk) => chunk.chunkText),
    );
    expect(firstRun[0]?.contentForEmbedding.startsWith('Article title: Chunking')).toBe(true);
  });

  it('returns no chunks for blank article content', () => {
    const service = createService();

    const result = service.splitArticle({
      id: 'article-2',
      title: 'Empty',
      content: ' \n\t ',
      status: ArticleStatus.DRAFT,
      categoryId: null,
      tags: [],
      updatedAt: new Date('2026-05-09T12:00:00.000Z'),
    });

    expect(result).toEqual([]);
  });
});
