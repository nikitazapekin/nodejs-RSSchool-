import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../common/logger/app-logger.service';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

@Injectable()
export class GeminiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.apiKey = this.getRequiredConfig('GEMINI_API_KEY');
    this.baseUrl = this.configService.get<string>('GEMINI_API_BASE_URL') ?? 'https://generativelanguage.googleapis.com';
    this.model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
  }

  async generateText(prompt: string, retries = 3): Promise<{ text: string; tokens?: number }> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.error(`Gemini API error: ${response.status} - ${errorBody}`);

          if (response.status === 429) {
            if (attempt < retries) {
              const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              continue;
            }
            throw new ServiceUnavailableException('Gemini API rate limit exceeded');
          }

          if (response.status === 400 || response.status === 403) {
            throw new InternalServerErrorException('Invalid Gemini API key or authentication error');
          }

          throw new ServiceUnavailableException('Gemini API unavailable');
        }

        const data: GeminiResponse = await response.json();

        if (data.error) {
          throw new ServiceUnavailableException(`Gemini API error: ${data.error.message}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const tokens = data.usageMetadata?.totalTokenCount;

        return { text, tokens };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && error.name === 'AbortError') {
          if (attempt < retries) continue;
          throw new ServiceUnavailableException('Gemini API request timeout');
        }

        if (error instanceof InternalServerErrorException || error instanceof ServiceUnavailableException) {
          throw error;
        }

        if (attempt < retries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    throw new ServiceUnavailableException(`Gemini API request failed: ${lastError?.message}`);
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new Error(`Missing required config: ${key}`);
    return value;
  }
}
