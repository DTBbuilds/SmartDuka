import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SkipSubscriptionCheck } from '../auth/guards/subscription-status.guard';

/**
 * Lightweight ping controller for frontend connectivity checks.
 * Ad blockers (uBlock Origin, Adblock Plus, etc.) often block requests to
 * URLs containing "/health" because some trackers use similar endpoints.
 * This /ping endpoint avoids those false positives.
 */
@Controller('ping')
@SkipThrottle()
@SkipSubscriptionCheck()
export class PingController {
  @Get()
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
