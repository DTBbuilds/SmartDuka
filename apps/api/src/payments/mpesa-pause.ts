import { ConfigService } from '@nestjs/config';

/**
 * MPESA-P0-EMERGENCY-DEPLOY1 — fail-closed kill switch.
 *
 * M-Pesa STK initiation is PAUSED unless the environment EXPLICITLY opts in
 * with MPESA_PAYMENTS_PAUSED=false (or 'active'/'enabled'). An unset or
 * unrecognized value keeps initiation paused: during an emergency repair,
 * the safe state must be the default, and activation must be a deliberate
 * operator action (separately authorized).
 *
 * Existing pending payments are never affected — they keep settling via
 * callback and the reconciliation loop.
 */
export function mpesaPaymentsPaused(configService: ConfigService): boolean {
  const raw = configService.get<string>('MPESA_PAYMENTS_PAUSED');
  return raw !== 'false' && raw !== 'active' && raw !== 'enabled';
}

export const MPESA_PAUSE_MESSAGE =
  'M-Pesa payments are temporarily paused by the platform operator. Existing pending payments continue to settle normally.';
