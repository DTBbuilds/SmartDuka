import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 60 * 1000; // 1 minute default

  /**
   * Get cached value or execute factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries for a shop
   */
  clearShopCache(shopId: string): number {
    return this.deletePattern(`shop:${shopId}:*`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate cache key for shop-specific data
   */
  static shopKey(shopId: string, resource: string, ...params: (string | number)[]): string {
    const paramStr = params.length > 0 ? `:${params.join(':')}` : '';
    return `shop:${shopId}:${resource}${paramStr}`;
  }

  /**
   * Generate cache key for paginated data
   */
  static paginatedKey(
    shopId: string,
    resource: string,
    page: number,
    limit: number,
    filters?: Record<string, any>,
  ): string {
    const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
    return `shop:${shopId}:${resource}:page:${page}:limit:${limit}${filterStr}`;
  }
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30 * 1000,        // 30 seconds - for frequently changing data
  MEDIUM: 2 * 60 * 1000,   // 2 minutes - for moderately changing data
  LONG: 10 * 60 * 1000,    // 10 minutes - for rarely changing data
  STATS: 60 * 1000,        // 1 minute - for statistics/aggregations
  CATEGORIES: 5 * 60 * 1000, // 5 minutes - for categories
  PRODUCTS: 30 * 1000,     // 30 seconds - for product lists
};
