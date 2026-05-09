import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppLogger } from '../common/logger/app-logger.service';

interface GeminiApiError {
  code?: number;
  message?: string;
  status?: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: GeminiApiError;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
  error?: GeminiApiError;
}

@Injectable()
export class GeminiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.apiKey = this.getRequiredConfig('GEMINI_API_KEY');
    this.baseUrl =
      this.configService.get<string>('GEMINI_API_BASE_URL') ??
      'https://generativelanguage.googleapis.com';
    this.model =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
    this.embeddingModel =
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ??
      'text-embedding-004';
  }

  async generateText(
    prompt: string,
    retries = 3,
  ): Promise<{ text: string; tokens?: number }> {
    const data = await this.request<GeminiGenerateResponse>(
      `/v1beta/models/${this.model}:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      retries,
    );

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    const tokens = data.usageMetadata?.totalTokenCount;

    return { text, tokens };
  }

  async embedQuery(text: string, retries = 3): Promise<number[]> {
    return this.embed(text, 'RETRIEVAL_QUERY', retries);
  }

  async embedDocuments(texts: string[], retries = 3): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      embeddings.push(await this.embed(text, 'RETRIEVAL_DOCUMENT', retries));
    }

    return embeddings;
  }

  private async embed(
    text: string,
    taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT',
    retries: number,
  ): Promise<number[]> {
    const data = await this.request<GeminiEmbeddingResponse>(
      `/v1beta/models/${this.embeddingModel}:embedContent`,
      {
        content: {
          parts: [{ text }],
        },
        taskType,
      },
      retries,
    );

    const values = data.embedding?.values ?? [];

    if (values.length === 0) {
      throw new ServiceUnavailableException('Gemini embedding response was empty');
    }

    return values;
  }

  private async request<T extends { error?: GeminiApiError }>(
    path: string,
    body: Record<string, unknown>,
    retries: number,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const data = (await response.json()) as T;

        if (!response.ok || data.error) {
          this.handleApiError(response.status, data.error, attempt, retries);
        }

        return data;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && error.name === 'AbortError') {
          if (attempt < retries) {
            await this.delayWithBackoff(attempt);
            continue;
          }

          throw new ServiceUnavailableException('Gemini API request timeout');
        }

        if (
          error instanceof InternalServerErrorException ||
          error instanceof ServiceUnavailableException
        ) {
          throw error;
        }

        if (attempt < retries) {
          await this.delayWithBackoff(attempt);
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ServiceUnavailableException(
      `Gemini API request failed: ${lastError?.message ?? 'unknown error'}`,
    );
  }

  private handleApiError(
    statusCode: number,
    error: GeminiApiError | undefined,
    attempt: number,
    retries: number,
  ): never {
    const errorCode = error?.code ?? statusCode;
    const errorMessage = error?.message ?? 'Unknown Gemini API error';

    this.logger.error(
      `Gemini API error: ${errorCode} - ${errorMessage}`,
      undefined,
      'GeminiService',
    );

    if (errorCode === 429 && attempt < retries) {
      throw new RetryableGeminiError();
    }

    if (errorCode === 429) {
      throw new ServiceUnavailableException('Gemini API rate limit exceeded');
    }

    if (errorCode === 400 || errorCode === 403) {
      throw new InternalServerErrorException(
        'Invalid Gemini API key or authentication error',
      );
    }

    throw new ServiceUnavailableException('Gemini API unavailable');
  }

  private async delayWithBackoff(attempt: number): Promise<void> {
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }

    return value;
  }
}

class RetryableGeminiError extends Error {
  constructor() {
    super('Gemini API rate limit exceeded');
  }
}
