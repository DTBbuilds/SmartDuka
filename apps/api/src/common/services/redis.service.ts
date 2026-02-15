import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Service with automatic fallback to in-memory cache
 * 
 * Features:
 * - Connects to Redis if REDIS_URL is configured
 * - Falls back to in-memory Map if Redis unavailable
 * - Automatic reconnection handling
 * - TTL support for both Redis and in-memory
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private useInMemory = false;
  
  // In-memory fallback cache
  private memoryCache = new Map<string, { value: string; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      this.logger.log('Redis not configured - using in-memory cache (this is fine for development)');
      this.useInMemory = true;
      this.startMemoryCleanup();
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 10000,
      });

      this.client.on('connect', () => {
        this.logger.log('✅ Redis connected');
        this.isConnected = true;
        this.useInMemory = false;
      });

      this.client.on('error', (error) => {
        this.logger.error(`Redis error: ${error.message}`);
        if (!this.useInMemory) {
          this.logger.warn('Falling back to in-memory cache');
          this.useInMemory = true;
          this.startMemoryCleanup();
        }
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.logger.log('Redis reconnecting...');
      });

      await this.client.connect();
    } catch (error: any) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      this.logger.warn('Using in-memory cache fallback');
      this.useInMemory = true;
      this.startMemoryCleanup();
    }
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Start periodic cleanup of expired in-memory entries
   */
  private startMemoryCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.isConnected && !this.useInMemory;
  }

  /**
   * Get cache mode info
   */
  getCacheMode(): 'redis' | 'memory' {
    return this.useInMemory ? 'memory' : 'redis';
  }

  /**
   * Set a value with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useInMemory) {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
      this.memoryCache.set(key, { value, expiresAt });
      return;
    }

    try {
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
    } catch (error: any) {
      this.logger.error(`Redis SET error: ${error.message}`);
      // Fallback to memory
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
      this.memoryCache.set(key, { value, expiresAt });
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (this.useInMemory) {
      const entry = this.memoryCache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        this.memoryCache.delete(key);
        return null;
      }
      return entry.value;
    }

    try {
      return await this.client!.get(key);
    } catch (error: any) {
      this.logger.error(`Redis GET error: ${error.message}`);
      // Try memory fallback
      const entry = this.memoryCache.get(key);
      return entry && Date.now() <= entry.expiresAt ? entry.value : null;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<boolean> {
    if (this.useInMemory) {
      return this.memoryCache.delete(key);
    }

    try {
      const result = await this.client!.del(key);
      return result > 0;
    } catch (error: any) {
      this.logger.error(`Redis DEL error: ${error.message}`);
      return this.memoryCache.delete(key);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (this.useInMemory) {
      let deleted = 0;
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deleted++;
        }
      }
      return deleted;
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.client!.del(...keys);
    } catch (error: any) {
      this.logger.error(`Redis deletePattern error: ${error.message}`);
      // Fallback to memory
      let deleted = 0;
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deleted++;
        }
      }
      return deleted;
    }
  }

  /**
   * Set JSON value with optional TTL
   */
  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Get and parse JSON value
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Get or set with factory function (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    const cached = await this.getJSON<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.setJSON(key, value, ttlSeconds);
    return value;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.useInMemory) {
      const entry = this.memoryCache.get(key);
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) {
        this.memoryCache.delete(key);
        return false;
      }
      return true;
    }

    try {
      return (await this.client!.exists(key)) > 0;
    } catch (error: any) {
      this.logger.error(`Redis EXISTS error: ${error.message}`);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (this.useInMemory) {
      const entry = this.memoryCache.get(key);
      const current = entry ? parseInt(entry.value, 10) || 0 : 0;
      const newValue = current + 1;
      this.memoryCache.set(key, { value: String(newValue), expiresAt: entry?.expiresAt || Infinity });
      return newValue;
    }

    try {
      return await this.client!.incr(key);
    } catch (error: any) {
      this.logger.error(`Redis INCR error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Set expiry on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.useInMemory) {
      const entry = this.memoryCache.get(key);
      if (!entry) return false;
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
      return true;
    }

    try {
      return (await this.client!.expire(key, ttlSeconds)) === 1;
    } catch (error: any) {
      this.logger.error(`Redis EXPIRE error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    mode: 'redis' | 'memory';
    connected: boolean;
    keys?: number;
    memoryUsage?: string;
  }> {
    if (this.useInMemory) {
      return {
        mode: 'memory',
        connected: false,
        keys: this.memoryCache.size,
      };
    }

    try {
      const info = await this.client!.info('memory');
      const dbSize = await this.client!.dbsize();
      const memMatch = info.match(/used_memory_human:(\S+)/);
      
      return {
        mode: 'redis',
        connected: this.isConnected,
        keys: dbSize,
        memoryUsage: memMatch ? memMatch[1] : 'unknown',
      };
    } catch (error: any) {
      return {
        mode: 'redis',
        connected: false,
      };
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flushAll(): Promise<void> {
    if (this.useInMemory) {
      this.memoryCache.clear();
      return;
    }

    try {
      await this.client!.flushdb();
    } catch (error: any) {
      this.logger.error(`Redis FLUSHDB error: ${error.message}`);
      this.memoryCache.clear();
    }
  }

  /**
   * Get the raw Redis client (for advanced operations)
   * Returns null if using in-memory fallback
   */
  getClient(): Redis | null {
    return this.useInMemory ? null : this.client;
  }
}
