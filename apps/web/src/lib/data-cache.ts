'use client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxEntries: number;
  persistToStorage: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  persistToStorage: true,
};

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private storageKey = 'smartduka:dataCache';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);

    // Enforce max entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });

    this.saveToStorage();
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get data age in milliseconds
   */
  getAge(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.saveToStorage();
  }

  /**
   * Invalidate keys matching pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    this.saveToStorage();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  /**
   * Get or fetch data with caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistToStorage || typeof window === 'undefined') return;

    try {
      const serializable: Record<string, CacheEntry<any>> = {};
      for (const [key, entry] of this.cache.entries()) {
        // Only persist non-expired entries
        if (Date.now() <= entry.expiresAt) {
          serializable[key] = entry;
        }
      }
      localStorage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch (e) {
      // Storage might be full or unavailable
      console.warn('Failed to persist cache:', e);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (!this.config.persistToStorage || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Record<string, CacheEntry<any>>;
      const now = Date.now();

      for (const [key, entry] of Object.entries(parsed)) {
        // Only load non-expired entries
        if (entry.expiresAt > now) {
          this.cache.set(key, entry);
        }
      }
    } catch (e) {
      // Invalid data, clear it
      localStorage.removeItem(this.storageKey);
    }
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
}

// Create specialized caches for different data types
export const dashboardCache = new DataCache({
  defaultTTL: 2 * 60 * 1000, // 2 minutes for dashboard stats
  maxEntries: 50,
  persistToStorage: true,
});

export const posCache = new DataCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for POS data (products, categories)
  maxEntries: 200,
  persistToStorage: true,
});

export const userDataCache = new DataCache({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for user-specific data
  maxEntries: 30,
  persistToStorage: true,
});

// Cache key generators
export const cacheKeys = {
  // Dashboard
  dashboardStats: (shopId: string) => `dashboard:stats:${shopId}`,
  dashboardSales: (shopId: string, period: string) => `dashboard:sales:${shopId}:${period}`,
  dashboardTopProducts: (shopId: string) => `dashboard:topProducts:${shopId}`,
  dashboardRecentSales: (shopId: string) => `dashboard:recentSales:${shopId}`,
  
  // POS
  posProducts: (shopId: string, branchId?: string) => `pos:products:${shopId}:${branchId || 'all'}`,
  posCategories: (shopId: string) => `pos:categories:${shopId}`,
  posCustomers: (shopId: string) => `pos:customers:${shopId}`,
  
  // User data
  userProfile: (userId: string) => `user:profile:${userId}`,
  userPreferences: (userId: string) => `user:preferences:${userId}`,
  shopSettings: (shopId: string) => `shop:settings:${shopId}`,
};

// Helper to clear all shop-related cache on logout
export function clearShopCache(shopId: string): void {
  dashboardCache.invalidatePattern(`dashboard:.*:${shopId}`);
  posCache.invalidatePattern(`pos:.*:${shopId}`);
  userDataCache.invalidatePattern(`shop:.*:${shopId}`);
}

// Helper to clear all cache on logout
export function clearAllCache(): void {
  dashboardCache.clear();
  posCache.clear();
  userDataCache.clear();
}

export { DataCache };
