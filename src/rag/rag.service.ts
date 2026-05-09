import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { GeminiService } from '../ai/gemini.service';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { AppLogger } from '../common/logger/app-logger.service';
import { PrismaService } from '../database/prisma.service';
import { RagChatRequestDto } from './dto/rag-chat-request.dto';
import { RagSearchRequestDto } from './dto/rag-search-request.dto';
import { ReindexRequestDto } from './dto/reindex-request.dto';
import {
  RagChunk,
  RagConversationMessage,
  RagIndexableArticle,
  RagSearchFilters,
  RagSearchHit,
  RagVectorPayload,
} from './interfaces/rag.interface';
import { RagChunkerService } from './services/rag-chunker.service';
import { RagConversationService } from './services/rag-conversation.service';
import { QdrantVectorStoreService } from './services/qdrant-vector-store.service';

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly chunker: RagChunkerService,
    private readonly vectorStore: QdrantVectorStoreService,
    private readonly conversations: RagConversationService,
    private readonly logger: AppLogger,
  ) {}

  async reindex(request: ReindexRequestDto) {
    const onlyPublished = request.onlyPublished ?? true;
    const articleIds = [...new Set(request.articleIds ?? [])];

    await this.vectorStore.ensureReady();

    const vectorSize = await this.resolveVectorSize();

    if (articleIds.length === 0) {
      await this.vectorStore.recreateCollection(vectorSize);
    } else {
      await this.vectorStore.ensureCollection(vectorSize);
      for (const articleId of articleIds) {
        await this.vectorStore.deleteArticleIfExists(articleId);
      }
    }

    const articles = await this.fetchArticles({ onlyPublished, articleIds });
    const chunks = articles.flatMap((article) => this.chunker.splitArticle(article));

    await this.indexChunks(chunks);

    return {
      indexedArticles: articles.length,
      indexedChunks: chunks.length,
      vectorCollection: this.vectorStore.getCollectionName(),
    };
  }

  async search(request: RagSearchRequestDto) {
    const limit = request.limit ?? 5;
    const query = request.query.trim();
    const filters = this.buildFilters(request);

    const queryEmbedding = await this.wrapGeminiCall(() =>
      this.gemini.embedQuery(query),
    );
    const semanticHits = await this.vectorStore.search(queryEmbedding, limit * 4, filters);
    const rankedHits = this.rerankHits(query, semanticHits).slice(0, limit);

    return {
      results: rankedHits.map((hit) => ({
        articleId: hit.payload.articleId,
        articleTitle: hit.payload.articleTitle,
        chunk: hit.payload.chunkText,
        similarity: Number(hit.score.toFixed(6)),
      })),
    };
  }

  async chat(request: RagChatRequestDto) {
    const conversationId = request.conversationId?.trim() || randomUUID();
    const question = request.question.trim();
    const history = await this.conversations.getContext(conversationId);
    const queryEmbedding = await this.wrapGeminiCall(() =>
      this.gemini.embedQuery(question),
    );
    const retrievedHits = await this.vectorStore.search(queryEmbedding, 8);
    const groundedHits = this.rerankHits(question, retrievedHits).slice(0, 5);

    let answer: string;

    if (groundedHits.length === 0) {
      answer =
        'I could not find any relevant indexed Knowledge Hub content for this question.';
    } else {
      const prompt = this.buildGroundedPrompt(question, history, groundedHits);
      const generated = await this.wrapGeminiCall(() =>
        this.gemini.generateText(prompt),
      );
      answer = generated.text.trim();
    }

    await this.conversations.appendConversationTurn(conversationId, question, answer);

    return {
      answer,
      sources: groundedHits.map((hit) => ({
        articleId: hit.payload.articleId,
        articleTitle: hit.payload.articleTitle,
        relevantChunk: hit.payload.chunkText,
      })),
      conversationId,
    };
  }

  async getConversationHistory(conversationId: string) {
    const messages = await this.conversations.getHistory(conversationId);

    return {
      conversationId,
      messages,
    };
  }

  async deleteIndexedArticle(articleId: string): Promise<void> {
    await this.vectorStore.ensureReady();
    await this.vectorStore.deleteArticle(articleId);
  }

  private async fetchArticles(input: {
    onlyPublished: boolean;
    articleIds: string[];
  }): Promise<RagIndexableArticle[]> {
    const where = {
      ...(input.onlyPublished ? { status: ArticleStatus.PUBLISHED } : {}),
      ...(input.articleIds.length > 0 ? { id: { in: input.articleIds } } : {}),
    };

    const articles = await this.prisma.article.findMany({
      where,
      include: {
        tags: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      status: article.status as ArticleStatus,
      categoryId: article.categoryId,
      tags: article.tags.map((tag) => tag.name),
      updatedAt: article.updatedAt,
    }));
  }

  private async indexChunks(chunks: RagChunk[]): Promise<void> {
    const embeddingBatchSize = 16;
    const upsertBatchSize = 64;
    const indexedPoints: Array<{
      id: string;
      vector: number[];
      payload: RagVectorPayload;
    }> = [];

    for (let index = 0; index < chunks.length; index += embeddingBatchSize) {
      const batch = chunks.slice(index, index + embeddingBatchSize);
      const embeddings = await this.wrapGeminiCall(() =>
        this.gemini.embedDocuments(batch.map((chunk) => chunk.contentForEmbedding)),
      );

      if (embeddings.length !== batch.length) {
        throw new ServiceUnavailableException(
          'Gemini embedding batch response length mismatch',
        );
      }

      batch.forEach((chunk, batchIndex) => {
        indexedPoints.push({
          id: chunk.id,
          vector: embeddings[batchIndex],
          payload: {
            articleId: chunk.articleId,
            articleTitle: chunk.articleTitle,
            chunkIndex: chunk.chunkIndex,
            chunkText: chunk.chunkText,
            contentForEmbedding: chunk.contentForEmbedding,
            status: chunk.status,
            categoryId: chunk.categoryId,
            tags: chunk.tags,
            updatedAt: chunk.updatedAt,
          },
        });
      });
    }

    for (let index = 0; index < indexedPoints.length; index += upsertBatchSize) {
      await this.vectorStore.upsert(indexedPoints.slice(index, index + upsertBatchSize));
    }
  }

  private async resolveVectorSize(): Promise<number> {
    const probeEmbedding = await this.wrapGeminiCall(() =>
      this.gemini.embedQuery('Knowledge Hub vector dimension probe'),
    );

    if (probeEmbedding.length === 0) {
      throw new ServiceUnavailableException('Gemini embedding model returned an empty vector');
    }

    return probeEmbedding.length;
  }

  private rerankHits(query: string, hits: RagSearchHit[]): RagSearchHit[] {
    const normalizedQueryTokens = this.tokenize(query);

    return [...hits]
      .map((hit) => {
        const lexicalScore = this.calculateLexicalScore(
          normalizedQueryTokens,
          `${hit.payload.articleTitle} ${hit.payload.chunkText}`,
        );
        const titleBoost = hit.payload.articleTitle
          .toLowerCase()
          .includes(query.toLowerCase())
          ? 0.03
          : 0;

        return {
          hit,
          score: hit.score * 0.88 + lexicalScore * 0.12 + titleBoost,
        };
      })
      .sort((left, right) => right.score - left.score)
      .map((item) => item.hit);
  }

  private calculateLexicalScore(queryTokens: string[], text: string): number {
    if (queryTokens.length === 0) {
      return 0;
    }

    const textTokens = new Set(this.tokenize(text));
    const matched = queryTokens.filter((token) => textTokens.has(token)).length;
    return matched / queryTokens.length;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9а-яё]+/iu)
      .filter((token) => token.length > 1);
  }

  private buildFilters(request: RagSearchRequestDto): RagSearchFilters {
    return {
      ...(request.articleStatus ? { articleStatus: request.articleStatus } : {}),
      ...(request.categoryId ? { categoryId: request.categoryId } : {}),
      ...(request.tags?.length ? { tags: request.tags } : {}),
    };
  }

  private buildGroundedPrompt(
    question: string,
    history: RagConversationMessage[],
    hits: RagSearchHit[],
  ): string {
    const renderedHistory = history.length
      ? history
          .map((message) => `${message.role.toUpperCase()}: ${message.text}`)
          .join('\n')
      : 'No previous conversation context.';

    const renderedSources = hits
      .map(
        (hit, index) =>
          `[Source ${index + 1}] ${hit.payload.articleTitle} (articleId: ${hit.payload.articleId})\n${hit.payload.chunkText}`,
      )
      .join('\n\n');

    return `You are a Knowledge Hub RAG assistant.

Use only the provided Knowledge Hub sources and conversation context.
If the sources do not contain the answer, explicitly say that the information is not available in the indexed Knowledge Hub content.
Do not invent facts. Keep the answer concise but complete.

Conversation context:
${renderedHistory}

Knowledge Hub sources:
${renderedSources}

User question:
${question}

Answer:`;
  }

  private async wrapGeminiCall<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.logError('Gemini RAG integration failed', error, 'RagService');
      throw new ServiceUnavailableException('Gemini API unavailable');
    }
  }
}
