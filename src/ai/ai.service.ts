import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from './gemini.service';
import { CacheService } from './services/cache.service';
import { ConversationMemoryService } from './services/conversation-memory.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { getAnalyzePrompt, getSummarizePrompt, getTranslatePrompt } from './prompts';
import { SummaryLength } from './dto/summarize-article.dto';

type AnalyzeSeverity = 'info' | 'warning' | 'error';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly cache: CacheService,
    private readonly memory: ConversationMemoryService,
    private readonly usage: UsageTrackingService,
  ) {}

  async summarizeArticle(articleId: string, maxLength: SummaryLength = SummaryLength.MEDIUM) {
    const startedAt = Date.now();
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

    if (cached) {
      this.usage.recordCacheHit();
      this.usage.recordRequest('summarize', { durationMs: Date.now() - startedAt });
      return cached;
    }

    this.usage.recordCacheMiss();

    const prompt = getSummarizePrompt(article.content, maxLength);
    const result = await this.gemini.generateText(prompt);

    const response = {
      articleId,
      summary: result.text,
      originalLength: article.content.length,
      summaryLength: result.text.length,
    };

    this.cache.set(cacheKey, response);
    this.usage.recordRequest('summarize', {
      tokens: result.tokens,
      durationMs: Date.now() - startedAt,
    });

    return response;
  }

  async translateArticle(articleId: string, targetLanguage: string, sourceLanguage?: string) {
    const startedAt = Date.now();
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

    if (cached) {
      this.usage.recordCacheHit();
      this.usage.recordRequest('translate', { durationMs: Date.now() - startedAt });
      return cached;
    }

    this.usage.recordCacheMiss();
    const prompt = getTranslatePrompt(article.content, targetLanguage, sourceLanguage);
    const result = await this.gemini.generateText(prompt);
    const parsed = this.parseTranslateResponse(result.text, sourceLanguage);

    const response = {
      articleId,
      translatedText: parsed.translatedText,
      detectedLanguage: parsed.detectedLanguage,
    };

    this.cache.set(cacheKey, response);
    this.usage.recordRequest('translate', {
      tokens: result.tokens,
      durationMs: Date.now() - startedAt,
    });

    return response;
  }

  async analyzeArticle(articleId: string, task: string) {
    const startedAt = Date.now();
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException(`Article with id "${articleId}" not found`);
    }

    const prompt = getAnalyzePrompt(article.content, task);
    const result = await this.gemini.generateText(prompt);
    const parsed = this.parseAnalyzeResponse(result.text);

    const response = {
      articleId,
      analysis: parsed.analysis ?? result.text,
      suggestions: parsed.suggestions ?? [],
      severity: parsed.severity ?? 'info',
    };

    this.usage.recordRequest('analyze', {
      tokens: result.tokens,
      durationMs: Date.now() - startedAt,
    });

    return response;
  }

  async generate(prompt: string, sessionId?: string) {
    const startedAt = Date.now();
    const context = this.memory.getContext(sessionId);
    const sessionPrompt = this.buildGenericPrompt(prompt, context);
    const result = await this.gemini.generateText(sessionPrompt);
    this.memory.append(sessionId, prompt, result.text);
    this.usage.recordRequest('generate', {
      tokens: result.tokens,
      durationMs: Date.now() - startedAt,
    });
    return {
      text: result.text,
      ...(sessionId ? { sessionId } : {}),
    };
  }

  getUsageStats() {
    return {
      ...this.usage.getStats(),
      diagnostics: {
        cacheEntries: this.cache.getEntryCount(),
        conversationMemory: this.memory.getDiagnostics(),
      },
    };
  }

  private parseTranslateResponse(
    text: string,
    sourceLanguage?: string,
  ): { translatedText: string; detectedLanguage: string } {
    const parsed = this.tryParseJson(text);

    if (
      parsed &&
      typeof parsed.translatedText === 'string' &&
      parsed.translatedText.trim().length > 0 &&
      typeof parsed.detectedLanguage === 'string' &&
      parsed.detectedLanguage.trim().length > 0
    ) {
      return {
        translatedText: parsed.translatedText.trim(),
        detectedLanguage: parsed.detectedLanguage.trim(),
      };
    }

    return {
      translatedText: text.trim(),
      detectedLanguage: sourceLanguage ?? 'unknown',
    };
  }

  private parseAnalyzeResponse(text: string): {
    analysis: string;
    suggestions: string[];
    severity: AnalyzeSeverity;
  } {
    const parsed = this.tryParseJson(text);
    const severity = this.isSeverity(parsed?.severity) ? parsed.severity : 'info';
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.filter((item): item is string => typeof item === 'string')
      : [];

    if (parsed && typeof parsed.analysis === 'string' && parsed.analysis.trim().length > 0) {
      return {
        analysis: parsed.analysis.trim(),
        suggestions,
        severity,
      };
    }

    return {
      analysis: text.trim(),
      suggestions: [],
      severity: 'info',
    };
  }

  private tryParseJson(text: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(text) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private isSeverity(value: unknown): value is AnalyzeSeverity {
    return value === 'info' || value === 'warning' || value === 'error';
  }

  private buildGenericPrompt(
    prompt: string,
    context: Array<{ role: 'user' | 'assistant'; text: string }>,
  ): string {
    if (context.length === 0) {
      return prompt;
    }

    const renderedContext = context
      .map((message) => `${message.role.toUpperCase()}: ${message.text}`)
      .join('\n');

    return `Continue the conversation using the prior context below.

Conversation context:
${renderedContext}

USER: ${prompt}

ASSISTANT:`;
  }
}
