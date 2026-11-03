import { ConfigService } from '@nestjs/config';
import {
  mpesaInitiationBlockedForShop,
  MPESA_PAUSE_MESSAGE,
} from './mpesa-pause';

/**
 * MPESA-CANARY-GATE1 — merchant-isolated canary control regression tests.
 *
 * Semantics under test (fail-closed throughout):
 *   MPESA_PAYMENTS_PAUSED unset  → blocked for everyone EXCEPT canary shops
 *   MPESA_PAYMENTS_PAUSED 'true' → EMERGENCY: blocked for EVERYONE (the
 *                                  allowlist never overrides an explicit
 *                                  emergency pause)
 *   'false'/'active'/'enabled'   → active: nobody is blocked
 *   missing/malformed MPESA_CANARY_SHOP_IDS → NO exceptions (a missing env
 *                                  var can never enable payments)
 *   missing shopId               → blocked
 */
describe('MPESA-CANARY-GATE1 merchant-isolated pause', () => {
  const CANARY = '507f1f77bcf86cd7994390c1';
  const CANARY_2 = '507f1f77bcf86cd7994390c2';
  const OTHER = '507f1f77bcf86cd7994390d1';

  const config = (env: Record<string, string | undefined>) => {
    const cs = new ConfigService(env);
    return cs;
  };

  it('unset pause + canary allowlist → canary shop may initiate', () => {
    const cs = config({ MPESA_CANARY_SHOP_IDS: `${CANARY},${CANARY_2}` });
    expect(mpesaInitiationBlockedForShop(cs, CANARY)).toBe(false);
    expect(mpesaInitiationBlockedForShop(cs, CANARY_2)).toBe(false);
  });

  it('unset pause + canary allowlist → every OTHER shop is blocked', () => {
    const cs = config({ MPESA_CANARY_SHOP_IDS: CANARY });
    expect(mpesaInitiationBlockedForShop(cs, OTHER)).toBe(true);
  });

  it('unset pause + MISSING allowlist → nobody may initiate (no env var, no payments)', () => {
    const cs = config({});
    expect(mpesaInitiationBlockedForShop(cs, CANARY)).toBe(true);
    expect(mpesaInitiationBlockedForShop(cs, OTHER)).toBe(true);
  });

  it('EMERGENCY hard pause (explicit true) takes precedence over the allowlist', () => {
    const cs = config({
      MPESA_PAYMENTS_PAUSED: 'true',
      MPESA_CANARY_SHOP_IDS: CANARY,
    });
    expect(mpesaInitiationBlockedForShop(cs, CANARY)).toBe(true);
    expect(mpesaInitiationBlockedForShop(cs, OTHER)).toBe(true);
  });

  it('explicit activation (false/active/enabled) unblocks everyone', () => {
    for (const v of ['false', 'active', 'enabled']) {
      const cs = config({
        MPESA_PAYMENTS_PAUSED: v,
        MPESA_CANARY_SHOP_IDS: CANARY,
      });
      expect(mpesaInitiationBlockedForShop(cs, CANARY)).toBe(false);
      expect(mpesaInitiationBlockedForShop(cs, OTHER)).toBe(false);
    }
  });

  it('unrecognized pause values stay fail-closed (canary allowlist still honored)', () => {
    const cs = config({
      MPESA_PAYMENTS_PAUSED: 'yes-please',
      MPESA_CANARY_SHOP_IDS: CANARY,
    });
    expect(mpesaInitiationBlockedForShop(cs, CANARY)).toBe(false);
    expect(mpesaInitiationBlockedForShop(cs, OTHER)).toBe(true);
  });

  it('malformed allowlist entries are ignored (whitespace, empties)', () => {
    const cs = config({ MPESA_CANARY_SHOP_IDS: `  ${CANARY} , ,\t,${CANARY_2}` });
    expect(mpesaInitiationBlockedForShop(cs, CANARY)).toBe(false);
    expect(mpesaInitiationBlockedForShop(cs, CANARY_2)).toBe(false);
    expect(mpesaInitiationBlockedForShop(cs, OTHER)).toBe(true);
  });

  it('a missing shopId is always blocked while paused', () => {
    const cs = config({ MPESA_CANARY_SHOP_IDS: CANARY });
    expect(mpesaInitiationBlockedForShop(cs, undefined)).toBe(true);
  });

  it('an allowlist entry that merely CONTAINS the shopId is not a match', () => {
    const cs = config({ MPESA_CANARY_SHOP_IDS: `${CANARY}0` });
    expect(mpesaInitiationBlockedForShop(cs, CANARY)).toBe(true);
  });

  it('the pause message is operator-facing and mentions pending settlements', () => {
    expect(MPESA_PAUSE_MESSAGE).toContain('temporarily paused');
    expect(MPESA_PAUSE_MESSAGE).toContain('pending payments continue to settle');
  });
});
