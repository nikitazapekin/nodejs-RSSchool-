import { Injectable } from '@nestjs/common';

interface UsageStats {
  total: number;
  byEndpoint: Record<string, number>;
  tokenUsage: number;
  cache: {
    hits: number;
    misses: number;
  };
  latencyMs: {
    count: number;
    total: number;
    max: number;
  };
}

@Injectable()
export class UsageTrackingService {
  private stats: UsageStats = {
    total: 0,
    byEndpoint: {},
    tokenUsage: 0,
    cache: {
      hits: 0,
      misses: 0,
    },
    latencyMs: {
      count: 0,
      total: 0,
      max: 0,
    },
  };

  recordRequest(endpoint: string, options?: { tokens?: number; durationMs?: number }): void {
    this.stats.total++;
    this.stats.byEndpoint[endpoint] = (this.stats.byEndpoint[endpoint] ?? 0) + 1;
    if (options?.tokens) {
      this.stats.tokenUsage += options.tokens;
    }
    if (options?.durationMs !== undefined) {
      this.stats.latencyMs.count++;
      this.stats.latencyMs.total += options.durationMs;
      this.stats.latencyMs.max = Math.max(this.stats.latencyMs.max, options.durationMs);
    }
  }

  recordCacheHit(): void {
    this.stats.cache.hits++;
  }

  recordCacheMiss(): void {
    this.stats.cache.misses++;
  }

  getStats() {
    const cacheRequests = this.stats.cache.hits + this.stats.cache.misses;
    const averageLatencyMs =
      this.stats.latencyMs.count === 0
        ? 0
        : Number((this.stats.latencyMs.total / this.stats.latencyMs.count).toFixed(2));
    const cacheHitRatio =
      cacheRequests === 0
        ? 0
        : Number((this.stats.cache.hits / cacheRequests).toFixed(4));

    return {
      total: this.stats.total,
      byEndpoint: { ...this.stats.byEndpoint },
      tokenUsage: this.stats.tokenUsage,
      cache: {
        ...this.stats.cache,
        hitRatio: cacheHitRatio,
      },
      latencyMs: {
        average: averageLatencyMs,
        max: this.stats.latencyMs.max,
        samples: this.stats.latencyMs.count,
      },
    };
  }

  getTotalRequests(): number {
    return this.stats.total;
  }

  getEndpointRequests(endpoint: string): number {
    return this.stats.byEndpoint[endpoint] ?? 0;
  }
}
