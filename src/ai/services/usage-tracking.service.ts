import { Injectable } from '@nestjs/common';

interface UsageStats {
  total: number;
  byEndpoint: Record<string, number>;
  tokenUsage: number;
}

@Injectable()
export class UsageTrackingService {
  private stats: UsageStats = {
    total: 0,
    byEndpoint: {},
    tokenUsage: 0,
  };

  recordRequest(endpoint: string, tokens?: number): void {
    this.stats.total++;
    this.stats.byEndpoint[endpoint] = (this.stats.byEndpoint[endpoint] ?? 0) + 1;
    if (tokens) {
      this.stats.tokenUsage += tokens;
    }
  }

  getStats() {
    return { ...this.stats, byEndpoint: { ...this.stats.byEndpoint } };
  }

  getTotalRequests(): number {
    return this.stats.total;
  }

  getEndpointRequests(endpoint: string): number {
    return this.stats.byEndpoint[endpoint] ?? 0;
  }
}
