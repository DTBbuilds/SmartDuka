import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PinAttemptService } from '../services/pin-attempt.service';

/**
 * CASHIER-P0 F-17: PIN login abuse protection.
 *
 * Delegates to PinAttemptService, which keys attempts by shop + client IP —
 * varying the attempted PIN no longer resets the counter. Successful
 * verifications clear the counter (see auth.service), so legitimate
 * shared-device logins are not punished. The guard only *asserts*; failure
 * recording happens in the auth service where the verification outcome is
 * known.
 */
@Injectable()
export class PinRateLimitGuard implements CanActivate {
  constructor(private readonly pinAttemptService: PinAttemptService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const shopId = request.body?.shopId;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';

    // Missing parameters are rejected by validation later; nothing to gate.
    if (!shopId) return true;

    this.pinAttemptService.assertAllowed(shopId, ip);
    return true;
  }
}
