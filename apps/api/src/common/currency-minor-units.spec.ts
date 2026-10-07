import { StripeService } from '../stripe/stripe.service';
import { toMinorUnits, fromMinorUnits, toCents, fromCents } from './currency';

/**
 * P0-11A — GLOBAL CURRENCY + STRIPE MINOR-UNIT CORRECTNESS
 *
 * Stripe API amount semantics (docs.stripe.com/currencies) are independent of
 * ISO 4217 display decimals:
 *   - Default two-decimal: amount = round(major * 100).
 *   - True zero-decimal (amount = major): BIF CLP DJF GNF JPY KMF KRW MGA PYG
 *     RWF VND VUV XAF XOF XPF.
 *   - Special cases UGX and ISK: display zero-decimal, API amount requires
 *     x100 ("5 UGX -> amount 500", "5 ISK -> amount 500").
 * KES is Stripe-SUPPORTED and two-decimal ("100 KES -> amount 10000").
 */
describe('P0-11A currency minor-unit contract', () => {
  it('required conversion matrix', () => {
    // KES — two-decimal for Stripe (was 100x undercharged before P0-11A)
    expect(toMinorUnits(100, 'KES')).toBe(10000);
    expect(toMinorUnits(6000, 'KES')).toBe(600000);
    // UGX — display zero-decimal, API x100 backwards compatibility
    expect(toMinorUnits(5, 'UGX')).toBe(500);
    expect(toMinorUnits(1000, 'UGX')).toBe(100000);
    // ISK — same special case as UGX
    expect(toMinorUnits(5, 'ISK')).toBe(500);
    // Standard two-decimal
    expect(toMinorUnits(25.5, 'AUD')).toBe(2550);
    expect(toMinorUnits(12.34, 'USD')).toBe(1234);
    expect(toMinorUnits(175, 'HUF')).toBe(17500);
    // True zero-decimal
    expect(toMinorUnits(10, 'JPY')).toBe(10);
    expect(toMinorUnits(700, 'RWF')).toBe(700);
    expect(toMinorUnits(300, 'XOF')).toBe(300);
    expect(toMinorUnits(300, 'XAF')).toBe(300);
    expect(toMinorUnits(500, 'CLP')).toBe(500);
    expect(toMinorUnits(600, 'KRW')).toBe(600);
    expect(toMinorUnits(12000, 'VND')).toBe(12000);
  });

  it('fromMinorUnits is the exact inverse', () => {
    expect(fromMinorUnits(10000, 'KES')).toBe(100);
    expect(fromMinorUnits(600000, 'KES')).toBe(6000);
    expect(fromMinorUnits(500, 'UGX')).toBe(5);
    expect(fromMinorUnits(100000, 'UGX')).toBe(1000);
    expect(fromMinorUnits(500, 'ISK')).toBe(5);
    expect(fromMinorUnits(2550, 'AUD')).toBe(25.5);
    expect(fromMinorUnits(1234, 'USD')).toBe(12.34);
    expect(fromMinorUnits(17500, 'HUF')).toBe(175);
    expect(fromMinorUnits(10, 'JPY')).toBe(10);
    expect(fromMinorUnits(700, 'RWF')).toBe(700);
    expect(fromMinorUnits(300, 'XOF')).toBe(300);
    expect(fromMinorUnits(300, 'XAF')).toBe(300);
    expect(fromMinorUnits(500, 'CLP')).toBe(500);
    expect(fromMinorUnits(600, 'KRW')).toBe(600);
    expect(fromMinorUnits(12000, 'VND')).toBe(12000);
  });

  it('unknown currencies default to two-decimal and never inherit another currency flag', () => {
    expect(toMinorUnits(100, 'ZMW')).toBe(10000);
    expect(toMinorUnits(100, 'xyz')).toBe(10000);
    expect(fromMinorUnits(10000, 'ZMW')).toBe(100);
  });

  it('web toCents/fromCents share the identical contract', () => {
    expect(toCents(100, 'KES')).toBe(10000);
    expect(toCents(5, 'UGX')).toBe(500);
    expect(toCents(5, 'ISK')).toBe(500);
    expect(toCents(10, 'JPY')).toBe(10);
    expect(toCents(25.5, 'AUD')).toBe(2550);
    expect(fromCents(10000, 'KES')).toBe(100);
    expect(fromCents(500, 'UGX')).toBe(5);
  });

  it('round-trip: order amount -> provider amount -> convergence is exact (no 100x drift)', () => {
    const cases: Array<[number, string]> = [
      [100, 'KES'],
      [6000, 'KES'],
      [5, 'UGX'],
      [1000, 'UGX'],
      [25.5, 'AUD'],
      [12.34, 'USD'],
      [10, 'JPY'],
      [5, 'ISK'],
      [700, 'RWF'],
      [300, 'XOF'],
      [300, 'XAF'],
      [500, 'CLP'],
      [600, 'KRW'],
      [12000, 'VND'],
      [175, 'HUF'],
    ];
    for (const [major, currency] of cases) {
      const providerAmount = toMinorUnits(major, currency);
      const converged = fromMinorUnits(providerAmount, currency);
      expect(converged).toBeCloseTo(major, 6);
    }
  });

  describe('Stripe minimum validation (same minor-unit contract as creation)', () => {
    let svc: StripeService;

    beforeEach(() => {
      svc = new StripeService('', {} as any);
    });

    it('KES minimum is KSh 50.00 = 5000 minor; 100 minor (KSh 1) rejected, 5000 accepted', () => {
      expect(svc.validateMinimumAmount(100, 'kes').valid).toBe(false); // KSh 1.00
      expect(svc.validateMinimumAmount(4999, 'kes').valid).toBe(false);
      expect(svc.validateMinimumAmount(5000, 'kes').valid).toBe(true); // KSh 50.00
      expect(svc.validateMinimumAmount(600000, 'kes').valid).toBe(true); // KSh 6000
    });

    it('JPY minimum is 50 whole yen (zero-decimal, not divided by 100)', () => {
      expect(svc.validateMinimumAmount(49, 'jpy').valid).toBe(false);
      expect(svc.validateMinimumAmount(50, 'jpy').valid).toBe(true);
    });

    it('USD minimum 50 minor ($0.50)', () => {
      expect(svc.validateMinimumAmount(49, 'usd').valid).toBe(false);
      expect(svc.validateMinimumAmount(50, 'usd').valid).toBe(true);
    });

    it('formats minimums in major units per currency (no 100x mislabel)', () => {
      const rejected = svc.validateMinimumAmount(100, 'kes');
      expect(rejected.message).toContain('KSh 50'); // major units, not "5000"
      const jpyRejected = svc.validateMinimumAmount(10, 'jpy');
      expect(jpyRejected.message).toContain('¥50'); // not ¥0.50
    });
  });
});
