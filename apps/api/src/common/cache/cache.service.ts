import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    try {
      const expiresAt = Date.now() + ttlSeconds * 1000;
      this.cache.set(key, { value, expiresAt });
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error: any) {
      this.logger.error(`Cache SET failed for ${key}`, error?.message);
    }
  }

  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      if (!entry) return null;

      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return null;
      }

      this.logger.debug(`Cache HIT: ${key}`);
      return entry.value as T;
    } catch (error: any) {
      this.logger.error(`Cache GET failed for ${key}`, error?.message);
      return null;
    }
  }

  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.logger.debug(`Cache DELETE: ${key}`);
      }
      return deleted;
    } catch (error: any) {
      this.logger.error(`Cache DELETE failed for ${key}`, error?.message);
      return false;
    }
  }

  clear(): void {
    try {
      const size = this.cache.size;
      this.cache.clear();
      this.logger.debug(`Cache CLEAR: ${size} entries removed`);
    } catch (error: any) {
      this.logger.error('Cache CLEAR failed', error?.message);
    }
  }

  getStats(): { size: number; entries: Array<{ key: string; expiresIn: number }> } {
    const entries: Array<{ key: string; expiresIn: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      const expiresIn = Math.max(0, entry.expiresAt - Date.now());
      entries.push({ key, expiresIn });
    }

    return { size: this.cache.size, entries };
  }

  cleanup(): number {
    try {
      let removed = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        this.logger.debug(`Cache CLEANUP: ${removed} expired entries removed`);
      }

      return removed;
    } catch (error: any) {
      this.logger.error('Cache CLEANUP failed', error?.message);
      return 0;
    }
  }
}
