import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlSec: number;

  constructor(private readonly configService: ConfigService) {
    this.ttlSec = Number(this.configService.get<string>('AI_CACHE_TTL_SEC') ?? '300');
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: unknown): void {
    const expiresAt = Date.now() + this.ttlSec * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  generateKey(parts: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(parts)).toString('base64');
  }

  clear(): void {
    this.cache.clear();
  }

  getEntryCount(): number {
    return this.cache.size;
  }
}
