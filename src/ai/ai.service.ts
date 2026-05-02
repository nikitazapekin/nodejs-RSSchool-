import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from './gemini.service';
import { CacheService } from './services/cache.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { getSummarizePrompt } from './prompts';
import { SummaryLength } from './dto/summarize-article.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly cache: CacheService,
    private readonly usage: UsageTrackingService,
  ) {}

  async summarizeArticle(articleId: string, maxLength: SummaryLength = SummaryLength.MEDIUM) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException(`Article with id "${articleId}" not found`);
    }

    const cacheKey = this.cache.generateKey({
      type: 'summarize',
      articleId,
      maxLength,
      updatedAt: article.updatedAt.getTime(),
    });

    const cached = this.cache.get(cacheKey) as
      | { articleId: string; summary: string; originalLength: number; summaryLength: number }
      | null;

    if (cached) return cached;

    const prompt = getSummarizePrompt(article.content, maxLength);
    const result = await this.gemini.generateText(prompt);

    const response = {
      articleId,
      summary: result.text,
      originalLength: article.content.length,
      summaryLength: result.text.length,
    };

    this.cache.set(cacheKey, response);
    this.usage.recordRequest('summarize', result.tokens);

    return response;
  }

  async translateArticle(articleId: string, targetLanguage: string, sourceLanguage?: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException(`Article with id "${articleId}" not found`);
    }

    const cacheKey = this.cache.generateKey({
      type: 'translate',
      articleId,
      targetLanguage,
      sourceLanguage,
      updatedAt: article.updatedAt.getTime(),
    });

    const cached = this.cache.get(cacheKey) as
      | { articleId: string; translatedText: string; detectedLanguage: string }
      | null;

    if (cached) return cached;

    const { getTranslatePrompt } = await import('./prompts');
    const prompt = getTranslatePrompt(article.content, targetLanguage, sourceLanguage);
    const result = await this.gemini.generateText(prompt);

    const response = {
      articleId,
      translatedText: result.text,
      detectedLanguage: sourceLanguage ?? 'auto-detected',
    };

    this.cache.set(cacheKey, response);
    this.usage.recordRequest('translate', result.tokens);

    return response;
  }

  async analyzeArticle(articleId: string, task: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException(`Article with id "${articleId}" not found`);
    }

    const { getAnalyzePrompt } = await import('./prompts');
    const prompt = getAnalyzePrompt(article.content, task);
    const result = await this.gemini.generateText(prompt);

    let parsed: { analysis: string; suggestions: string[]; severity: 'info' | 'warning' | 'error' };

    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = {
        analysis: result.text,
        suggestions: [],
        severity: 'info' as const,
      };
    }

    const response = {
      articleId,
      analysis: parsed.analysis ?? result.text,
      suggestions: parsed.suggestions ?? [],
      severity: parsed.severity ?? 'info',
    };

    this.usage.recordRequest('analyze', result.tokens);

    return response;
  }

  async generate(prompt: string) {
    const result = await this.gemini.generateText(prompt);
    this.usage.recordRequest('generate', result.tokens);
    return { text: result.text };
  }

  getUsageStats() {
    return this.usage.getStats();
  }
}
