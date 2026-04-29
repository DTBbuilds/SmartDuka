import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

/**
 * LoginAttemptService
 *
 * Tracks failed login attempts per email and enforces account lockout
 * after a configurable threshold to mitigate brute-force / credential
 * stuffing attacks.
 *
 * Strategy:
 * - In-memory store keyed by lowercased email (single-instance friendly).
 * - Sliding window: counter resets if no failures within ATTEMPT_WINDOW_MS.
 * - On reaching MAX_ATTEMPTS, the email is locked for LOCK_DURATION_MS.
 * - Successful login clears the counter and any active lock.
 *
 * NOTE: For multi-instance deployments (Render with >1 instance), back this
 * with Redis. Current implementation is sufficient for single-instance.
 */
@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);

  // Configurable thresholds (kept simple; can be moved to ConfigService later)
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // rolling 15 min window

  private readonly attempts = new Map<
    string,
    { count: number; firstAttemptAt: number; lockedUntil: number | null }
  >();

  /**
   * Throws UnauthorizedException if the given email is currently locked out.
   * Call this BEFORE checking credentials so we don't leak account info via
   * differential timing on locked-out accounts.
   */
  ensureNotLocked(email: string): void {
    const key = this.key(email);
    const entry = this.attempts.get(key);
    if (!entry || !entry.lockedUntil) return;

    const now = Date.now();
    if (entry.lockedUntil > now) {
      const minutesLeft = Math.ceil((entry.lockedUntil - now) / 60000);
      this.logger.warn(
        `Login blocked for ${key} - locked for ${minutesLeft} more minute(s)`,
      );
      throw new UnauthorizedException(
        `Too many failed login attempts. Try again in ${minutesLeft} minute(s).`,
      );
    }

    // Lock expired — clear it and start fresh
    this.attempts.delete(key);
  }

  /**
   * Record a failed login attempt. Returns the new attempt count.
   * Locks the account when MAX_ATTEMPTS is reached.
   */
  recordFailure(email: string): number {
    const key = this.key(email);
    const now = Date.now();
    const existing = this.attempts.get(key);

    // Reset window if expired
    if (
      !existing ||
      now - existing.firstAttemptAt > this.ATTEMPT_WINDOW_MS
    ) {
      this.attempts.set(key, {
        count: 1,
        firstAttemptAt: now,
        lockedUntil: null,
      });
      return 1;
    }

    existing.count += 1;

    if (existing.count >= this.MAX_ATTEMPTS) {
      existing.lockedUntil = now + this.LOCK_DURATION_MS;
      this.logger.warn(
        `Account locked for ${key} after ${existing.count} failed attempts. Lock expires in ${this.LOCK_DURATION_MS / 60000} min`,
      );
    }

    this.attempts.set(key, existing);
    return existing.count;
  }

  /**
   * Clear failures and any lock on successful authentication.
   */
  recordSuccess(email: string): void {
    this.attempts.delete(this.key(email));
  }

  /**
   * Read-only status for diagnostics / admin tooling.
   */
  getStatus(email: string): {
    failedAttempts: number;
    lockedUntil: Date | null;
    isLocked: boolean;
  } {
    const entry = this.attempts.get(this.key(email));
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

  private key(email: string): string {
    return (email || '').toLowerCase().trim();
  }
}
