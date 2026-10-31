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
  /**
   * CASHIER-P0 GATE1: second layer against IDENTITY ROTATION. A per-IP
   * limiter alone can be bypassed by an attacker who rotates IPs (each new
   * IP starts a fresh counter). The shop-wide counter aggregates failures
   * across ALL IPs of one shop and locks PIN login for the whole shop when
   * the aggregate threshold is crossed. The threshold is set high enough
   * that a legitimate shared-device shop (several cashiers, occasional
   * typos) never reaches it in a rolling 15-minute window.
   */
  private readonly SHOP_WIDE_MAX_FAILURES = 30;

  private readonly attempts = new Map<
    string,
    { count: number; firstFailureAt: number; lockedUntil: number | null }
  >();
  private readonly shopWide = new Map<
    string,
    { count: number; firstFailureAt: number; lockedUntil: number | null }
  >();

  /** Throws 429 when this shop+IP — or the whole shop — is locked out. */
  assertAllowed(shopId: string, ip: string): void {
    this.pruneIfLarge();
    this.assertEntry(this.attempts, this.key(shopId, ip), 'PIN attempts');
    this.assertEntry(
      this.shopWide,
      `shop:${shopId}`,
      'PIN attempts (shop-wide)',
    );
  }

  private assertEntry(
    store: Map<
      string,
      { count: number; firstFailureAt: number; lockedUntil: number | null }
    >,
    key: string,
    label: string,
  ): void {
    const entry = store.get(key);
    if (!entry?.lockedUntil) return;

    const now = Date.now();
    if (entry.lockedUntil > now) {
      const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
      throw new HttpException(
        `Too many failed ${label}. Try again in ${minutesLeft} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    // Lock expired — start fresh.
    store.delete(key);
  }

  /** Record a failed PIN verification for this shop+IP (and shop-wide). */
  recordFailure(shopId: string, ip: string): number {
    const perIp = this.recordInto(
      this.attempts,
      this.key(shopId, ip),
      this.MAX_FAILURES,
    );
    this.recordInto(
      this.shopWide,
      `shop:${shopId}`,
      this.SHOP_WIDE_MAX_FAILURES,
    );
    return perIp;
  }

  private recordInto(
    store: Map<
      string,
      { count: number; firstFailureAt: number; lockedUntil: number | null }
    >,
    key: string,
    maxFailures: number,
  ): number {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now - existing.firstFailureAt > this.FAILURE_WINDOW_MS) {
      store.set(key, { count: 1, firstFailureAt: now, lockedUntil: null });
      return 1;
    }

    existing.count += 1;
    if (existing.count >= maxFailures && !existing.lockedUntil) {
      existing.lockedUntil = now + this.LOCK_DURATION_MS;
      const scope = key.startsWith('shop:')
        ? `shop-wide (${key})`
        : `shop/ip (${this.maskIp(key)})`;
      this.logger.warn(
        `PIN attempts locked ${scope} after ${existing.count} failures (lock ${this.LOCK_DURATION_MS / 60000} min)`,
      );
    }
    store.set(key, existing);
    return existing.count;
  }

  /** Clear failures/lock after a successful PIN verification. */
  recordSuccess(shopId: string, ip: string): void {
    this.attempts.delete(this.key(shopId, ip));
    // Shop-wide: a success erodes one failure so legitimate traffic on a
    // shared device slowly clears aggregate noise, but a burst attacker
    // still hits the shop-wide threshold.
    const entry = this.shopWide.get(`shop:${shopId}`);
    if (entry) {
      entry.count = Math.max(0, entry.count - 1);
      if (entry.count === 0) this.shopWide.delete(`shop:${shopId}`);
    }
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
    if (this.attempts.size + this.shopWide.size < this.MAX_TRACKED_KEYS) return;
    const now = Date.now();
    for (const store of [this.attempts, this.shopWide]) {
      for (const [key, entry] of store) {
        const windowExpired =
          now - entry.firstFailureAt > this.FAILURE_WINDOW_MS &&
          !entry.lockedUntil;
        const lockExpired = !!entry.lockedUntil && entry.lockedUntil <= now;
        if (windowExpired || lockExpired) store.delete(key);
      }
    }
  }
}
