import { ConfigService } from '@nestjs/config';

/**
 * MPESA-P0 payment-initiation pause — fail-closed kill switch.
 *
 * MPESA-CANARY-GATE1 adds merchant-isolated canary control on top of the
 * platform-wide pause:
 *
 *   MPESA_PAYMENTS_PAUSED state            | who may initiate
 *   ---------------------------------------+--------------------------------
 *   unset (fail-closed default)            | ONLY shops listed in
 *                                          | MPESA_CANARY_SHOP_IDS
 *   'true' (EMERGENCY hard pause)          | NOBODY — the emergency pause
 *                                          | always takes precedence over
 *                                          | the canary allowlist
 *   'false' / 'active' / 'enabled'         | everyone (normal activation)
 *
 * Merchant identity comes ONLY from trusted server-side context (the JWT
 * shopId passed by the controllers) — never from request bodies.
 *
 * A MISSING MPESA_CANARY_SHOP_IDS means NO exceptions: no new payments can
 * occur merely because an environment variable is absent. Existing pending
 * settlements are never affected — they keep settling via callback and the
 * reconciliation loop regardless of the pause.
 */
export function mpesaInitiationBlockedForShop(
  configService: ConfigService,
  shopId?: string,
): boolean {
  const raw = configService.get<string>('MPESA_PAYMENTS_PAUSED');

  if (raw === 'false' || raw === 'active' || raw === 'enabled') {
    return false; // normal activation — everyone may initiate
  }

  if (raw === 'true') {
    return true; // EMERGENCY hard pause — precedence over the allowlist
  }

  // Unset (fail-closed default): paused for everyone except explicitly
  // allowlisted canary shops.
  if (!shopId) return true;
  const allowlist = (configService.get<string>('MPESA_CANARY_SHOP_IDS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return !allowlist.includes(shopId);
}

export const MPESA_PAUSE_MESSAGE =
  'M-Pesa payments are temporarily paused by the platform operator. Existing pending payments continue to settle normally.';
