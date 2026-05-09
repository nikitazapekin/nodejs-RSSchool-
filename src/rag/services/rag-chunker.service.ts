import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RagChunk, RagIndexableArticle } from '../interfaces/rag.interface';

@Injectable()
export class RagChunkerService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = this.resolvePositiveNumber('RAG_CHUNK_SIZE', 800);
    this.chunkOverlap = this.resolveNonNegativeNumber('RAG_CHUNK_OVERLAP', 200);

    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error('RAG_CHUNK_OVERLAP must be smaller than RAG_CHUNK_SIZE');
    }
  }

  splitArticle(article: RagIndexableArticle): RagChunk[] {
    const normalized = this.normalizeText(article.content);

    if (!normalized) {
      return [];
    }

    const chunks: RagChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < normalized.length) {
      const idealEnd = Math.min(start + this.chunkSize, normalized.length);
      const end = this.findChunkEnd(normalized, start, idealEnd);
      const chunkText = normalized.slice(start, end).trim();

      if (chunkText.length > 0) {
        chunks.push({
          id: `${article.id}:${chunkIndex}`,
          articleId: article.id,
          articleTitle: article.title,
          chunkIndex,
          chunkText,
          contentForEmbedding: `Article title: ${article.title}\n\n${chunkText}`,
          status: article.status,
          categoryId: article.categoryId,
          tags: [...article.tags],
          updatedAt: article.updatedAt.toISOString(),
        });
        chunkIndex++;
      }

      if (end >= normalized.length) {
        break;
      }

      start = Math.max(end - this.chunkOverlap, start + 1);
      start = this.skipLeadingWhitespace(normalized, start);
    }

    return chunks;
  }

  private normalizeText(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \f\v]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private findChunkEnd(content: string, start: number, idealEnd: number): number {
    if (idealEnd >= content.length) {
      return content.length;
    }

    const boundaryFloor = Math.min(start + Math.floor(this.chunkSize * 0.6), idealEnd);
    const slice = content.slice(boundaryFloor, idealEnd + 1);
    const relativeBoundary = Math.max(
      slice.lastIndexOf('\n'),
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf(' '),
    );

    if (relativeBoundary === -1) {
      return idealEnd;
    }

    const boundaryLength =
      slice.startsWith('. ', relativeBoundary) ||
      slice.startsWith('! ', relativeBoundary) ||
      slice.startsWith('? ', relativeBoundary)
        ? 1
        : 0;

    return boundaryFloor + relativeBoundary + boundaryLength;
  }

  private skipLeadingWhitespace(content: string, start: number): number {
    let index = start;

    while (index < content.length && /\s/.test(content[index] ?? '')) {
      index++;
    }

    return index;
  }

  private resolvePositiveNumber(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const value = raw ? Number(raw) : fallback;

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${key} must be a positive number`);
    }

    return Math.floor(value);
  }

  private resolveNonNegativeNumber(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const value = raw ? Number(raw) : fallback;

    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }

    return Math.floor(value);
  }
}
