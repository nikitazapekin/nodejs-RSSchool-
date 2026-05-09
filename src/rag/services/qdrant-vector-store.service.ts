import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppLogger } from '../../common/logger/app-logger.service';
import { RagSearchFilters, RagSearchHit, RagVectorPayload } from '../interfaces/rag.interface';

interface QdrantResponse<T> {
  result?: T;
  status?: string;
}

interface QdrantCollectionInfo {
  config?: {
    params?: {
      vectors?:
        | {
            size?: number;
          }
        | Record<
            string,
            {
              size?: number;
            }
          >;
    };
  };
}

interface QdrantPoint {
  id: string | number;
  score?: number;
  payload?: RagVectorPayload;
}

interface QdrantCountResult {
  count: number;
}

interface QdrantQueryResult {
  points?: QdrantPoint[];
}

type QdrantFilter = {
  must?: Array<Record<string, unknown>>;
};

@Injectable()
export class QdrantVectorStoreService {
  private readonly provider: string;
  private readonly baseUrl: string;
  private readonly collectionName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.provider = this.configService.get<string>('RAG_VECTOR_DB_PROVIDER') ?? 'qdrant';
    this.baseUrl = (this.configService.get<string>('RAG_VECTOR_DB_URL') ?? 'http://vectordb:6333').replace(/\/$/, '');
    this.collectionName =
      this.configService.get<string>('RAG_VECTOR_COLLECTION') ?? 'knowledge_hub_articles';
  }

  getCollectionName(): string {
    return this.collectionName;
  }

  async ensureReady(): Promise<void> {
    this.ensureProvider();
    await this.requestText('/readyz');
  }

  async ensureCollection(vectorSize: number): Promise<void> {
    const existingSize = await this.getVectorSize();

    if (existingSize === null) {
      await this.createCollection(vectorSize);
      return;
    }

    if (existingSize !== vectorSize) {
      await this.recreateCollection(vectorSize);
    }
  }

  async recreateCollection(vectorSize: number): Promise<void> {
    if (await this.collectionExists()) {
      await this.request<void>(`/collections/${this.collectionName}`, {
        method: 'DELETE',
      });
    }

    await this.createCollection(vectorSize);
  }

  async deleteArticle(articleId: string): Promise<number> {
    const filter = this.buildArticleFilter(articleId);
    const count = await this.count(filter);

    if (count === 0) {
      throw new NotFoundException(`No indexed chunks found for article "${articleId}"`);
    }

    await this.request(`/collections/${this.collectionName}/points/delete?wait=true`, {
      method: 'POST',
      body: {
        filter,
      },
    });

    return count;
  }

  async deleteArticleIfExists(articleId: string): Promise<number> {
    const filter = this.buildArticleFilter(articleId);
    const count = await this.count(filter);

    if (count === 0) {
      return 0;
    }

    await this.request(`/collections/${this.collectionName}/points/delete?wait=true`, {
      method: 'POST',
      body: {
        filter,
      },
    });

    return count;
  }

  async upsert(
    points: Array<{
      id: string;
      vector: number[];
      payload: RagVectorPayload;
    }>,
  ): Promise<void> {
    if (points.length === 0) {
      return;
    }

    await this.request(`/collections/${this.collectionName}/points?wait=true`, {
      method: 'PUT',
      body: {
        points,
      },
    });
  }

  async search(
    vector: number[],
    limit: number,
    filters?: RagSearchFilters,
  ): Promise<RagSearchHit[]> {
    if (!(await this.collectionExists())) {
      return [];
    }

    const response = await this.request<QdrantQueryResult>(
      `/collections/${this.collectionName}/points/query`,
      {
        method: 'POST',
        body: {
          query: vector,
          limit,
          filter: this.buildSearchFilter(filters),
          with_payload: true,
          with_vector: false,
        },
      },
    );

    const points = response.result?.points ?? [];

    return points
      .filter(
        (point): point is QdrantPoint & { payload: RagVectorPayload; score: number } =>
          !!point.payload && typeof point.score === 'number',
      )
      .map((point) => ({
        id: String(point.id),
        payload: point.payload,
        score: point.score,
      }));
  }

  async countByArticleId(articleId: string): Promise<number> {
    return this.count(this.buildArticleFilter(articleId));
  }

  private async createCollection(vectorSize: number): Promise<void> {
    await this.request(`/collections/${this.collectionName}`, {
      method: 'PUT',
      body: {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      },
    });
  }

  private async count(filter?: QdrantFilter): Promise<number> {
    if (!(await this.collectionExists())) {
      return 0;
    }

    const response = await this.request<QdrantCountResult>(
      `/collections/${this.collectionName}/points/count`,
      {
        method: 'POST',
        body: {
          filter,
          exact: true,
        },
      },
    );

    return response.result?.count ?? 0;
  }

  private async collectionExists(): Promise<boolean> {
    try {
      await this.request<QdrantCollectionInfo>(`/collections/${this.collectionName}`);
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }

      throw error;
    }
  }

  private async getVectorSize(): Promise<number | null> {
    try {
      const response = await this.request<QdrantCollectionInfo>(
        `/collections/${this.collectionName}`,
      );
      const vectors = response.result?.config?.params?.vectors;

      if (!vectors) {
        return null;
      }

      if ('size' in vectors && typeof vectors.size === 'number') {
        return vectors.size;
      }

      const firstVectorConfig = Object.values(vectors)[0];
      return typeof firstVectorConfig?.size === 'number' ? firstVectorConfig.size : null;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }
  }

  private buildArticleFilter(articleId: string): QdrantFilter {
    return {
      must: [
        {
          key: 'articleId',
          match: {
            value: articleId,
          },
        },
      ],
    };
  }

  private buildSearchFilter(filters?: RagSearchFilters): QdrantFilter | undefined {
    if (!filters) {
      return undefined;
    }

    const must: Array<Record<string, unknown>> = [];

    if (filters.articleStatus) {
      must.push({
        key: 'status',
        match: {
          value: filters.articleStatus,
        },
      });
    }

    if (filters.categoryId) {
      must.push({
        key: 'categoryId',
        match: {
          value: filters.categoryId,
        },
      });
    }

    const normalizedTags = (filters.tags ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    for (const tag of normalizedTags) {
      must.push({
        key: 'tags',
        match: {
          value: tag,
        },
      });
    }

    return must.length > 0 ? { must } : undefined;
  }

  private ensureProvider(): void {
    if (this.provider !== 'qdrant') {
      throw new ServiceUnavailableException(
        `Unsupported vector DB provider "${this.provider}"`,
      );
    }
  }

  private async requestText(path: string): Promise<string> {
    const response = await this.fetch(path, { method: 'GET' });
    return response.text();
  }

  private async request<T>(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: Record<string, unknown>;
    } = { method: 'GET' },
  ): Promise<QdrantResponse<T>> {
    const response = await this.fetch(path, options);
    const text = await response.text();

    if (!text) {
      return {};
    }

    return JSON.parse(text) as QdrantResponse<T>;
  }

  private async fetch(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: Record<string, unknown>;
    },
  ): Promise<Response> {
    this.ensureProvider();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw new NotFoundException(`Vector collection "${this.collectionName}" not found`);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Qdrant request failed with status ${response.status}: ${errorBody || 'empty response'}`,
          undefined,
          'QdrantVectorStoreService',
        );
        throw new ServiceUnavailableException('Vector database request failed');
      }

      return response;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Vector database request timeout'
          : 'Vector database unavailable';

      this.logger.error(message, undefined, 'QdrantVectorStoreService');
      throw new ServiceUnavailableException(message);
    } finally {
      clearTimeout(timeout);
    }
  }
}
