import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * PinAttemptService — CASHIER-P0 F-17.
 *
 * The previous PinRateLimitGuard keyed attempts by `${shopId}:${pin}`, which
 * made brute force trivially bypassable: every *different* PIN got a fresh
 * counter, so the 10^4 PIN space could be walked without ever tripping the
 * limiter. It also counted successful logins against the same counter
 * (locking out legitimate shared-device logins) and never pruned its map.
 *
 * This service keys attempts by `${shopId}:${clientIp}` so varying the
 * attempted PIN cannot reset the counter, resets state on SUCCESS (shared
 * POS devices with several legitimate cashiers are not punished), prunes
 * expired entries, and logs lockouts for monitoring.
 *
 * NOTE: in-memory, single-instance friendly (same policy as
 * LoginAttemptService). For multi-instance deployments back this with Redis.
 */
@Injectable()
export class PinAttemptService {
  private readonly logger = new Logger(PinAttemptService.name);

  private readonly MAX_FAILURES = 5;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly FAILURE_WINDOW_MS = 15 * 60 * 1000; // rolling window
  private readonly MAX_TRACKED_KEYS = 5000;

  private readonly attempts = new Map<
    string,
    { count: number; firstFailureAt: number; lockedUntil: number | null }
  >();

  /** Throws 429 when this shop+IP is currently locked out. */
  assertAllowed(shopId: string, ip: string): void {
    this.pruneIfLarge();
    const entry = this.attempts.get(this.key(shopId, ip));
    if (!entry?.lockedUntil) return;

    const now = Date.now();
    if (entry.lockedUntil > now) {
      const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
      throw new HttpException(
        `Too many failed PIN attempts. Try again in ${minutesLeft} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    // Lock expired — start fresh.
    this.attempts.delete(this.key(shopId, ip));
  }

  /** Record a failed PIN verification for this shop+IP. */
  recordFailure(shopId: string, ip: string): number {
    const key = this.key(shopId, ip);
    const now = Date.now();
    const existing = this.attempts.get(key);

    if (!existing || now - existing.firstFailureAt > this.FAILURE_WINDOW_MS) {
      this.attempts.set(key, {
        count: 1,
        firstFailureAt: now,
        lockedUntil: null,
      });
      return 1;
    }

    existing.count += 1;
    if (existing.count >= this.MAX_FAILURES) {
      existing.lockedUntil = now + this.LOCK_DURATION_MS;
      this.logger.warn(
        `PIN attempts locked for shop ${shopId} ip ${this.maskIp(ip)} after ${existing.count} failures (lock ${this.LOCK_DURATION_MS / 60000} min)`,
      );
    }
    this.attempts.set(key, existing);
    return existing.count;
  }

  /** Clear failures/lock after a successful PIN verification. */
  recordSuccess(shopId: string, ip: string): void {
    this.attempts.delete(this.key(shopId, ip));
  }

  /** Diagnostics for admin tooling / monitoring. */
  getStatus(
    shopId: string,
    ip: string,
  ): {
    failedAttempts: number;
    lockedUntil: Date | null;
    isLocked: boolean;
  } {
    const entry = this.attempts.get(this.key(shopId, ip));
    if (!entry) {
      return { failedAttempts: 0, lockedUntil: null, isLocked: false };
    }
    const isLocked = !!entry.lockedUntil && entry.lockedUntil > Date.now();
    return {
      failedAttempts: entry.count,
      lockedUntil: entry.lockedUntil ? new Date(entry.lockedUntil) : null,
      isLocked,
    };
  }

  private key(shopId: string, ip: string): string {
    return `${shopId || 'unknown'}:${ip || 'unknown'}`;
  }

  private maskIp(ip: string): string {
    const parts = (ip || '').split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
    return ip ? ip.slice(0, 8) : 'unknown';
  }

  /** Opportunistic prune: drop expired windows/locks when the map grows. */
  private pruneIfLarge(): void {
    if (this.attempts.size < this.MAX_TRACKED_KEYS) return;
    const now = Date.now();
    for (const [key, entry] of this.attempts) {
      const windowExpired =
        now - entry.firstFailureAt > this.FAILURE_WINDOW_MS &&
        !entry.lockedUntil;
      const lockExpired = !!entry.lockedUntil && entry.lockedUntil <= now;
      if (windowExpired || lockExpired) this.attempts.delete(key);
    }
  }
}
