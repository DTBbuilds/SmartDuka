import {
  validateCheckoutSession,
  validateCashTender,
  probeSupportsQuoteIntegrity,
  type CheckoutQuote,
} from './checkout-session';

/**
 * POS-CURRENCY-CHECKOUT-DEPLOY1 — the capability probe MUST only enable
 * quote integrity on an affirmative 200. A non-404 heuristic false-positives
 * against the previously deployed release (whose /shops/currency-policy
 * already exists → 401) and would 400 every checkout in a web-first deploy.
 */
describe('probeSupportsQuoteIntegrity', () => {
  it('200 (new API) enables quote integrity', () => {
    expect(probeSupportsQuoteIntegrity(200)).toBe(true);
  });

  it('404 (legacy API) disables it', () => {
    expect(probeSupportsQuoteIntegrity(404)).toBe(false);
  });

  it('401/403 (auth problem, possibly new API) degrades to legacy mode', () => {
    expect(probeSupportsQuoteIntegrity(401)).toBe(false);
    expect(probeSupportsQuoteIntegrity(403)).toBe(false);
  });

  it('5xx and undefined (network failure) disable it', () => {
    expect(probeSupportsQuoteIntegrity(500)).toBe(false);
    expect(probeSupportsQuoteIntegrity(undefined)).toBe(false);
  });
});

/**
 * POS-CURRENCY-CHECKOUT-P0 — checkout session validation (client guards).
 * The reported incident: cart showed one item at KSh 625 while the payment
 * confirmation rendered 0 items / zero total and produced change equal to the
 * full tender. These guards make every such session refuse to submit.
 */
describe('validateCheckoutSession', () => {
  const quote: CheckoutQuote = { itemCount: 1, total: 625, currency: 'KES' };

  it('accepts a consistent session (the healthy path)', () => {
    expect(
      validateCheckoutSession({ cartItemsCount: 1, cartTotal: 625, quote }),
    ).toEqual({ ok: true });
  });

  it('refuses an empty cart (the 0-item confirmation case)', () => {
    const v = validateCheckoutSession({ cartItemsCount: 0, cartTotal: 0, quote });
    expect(v.ok).toBe(false);
    expect(v.rejection).toBe('empty-cart');
    expect(v.message).toMatch(/nothing was submitted/i);
  });

  it('refuses a zero total', () => {
    const v = validateCheckoutSession({
      cartItemsCount: 1,
      cartTotal: 0,
      quote: null,
    });
    expect(v.ok).toBe(false);
    expect(v.rejection).toBe('zero-total');
  });

  it('detects a stale quote (cart changed after checkout started)', () => {
    const v = validateCheckoutSession({
      cartItemsCount: 1,
      cartTotal: 725,
      quote,
    });
    expect(v.ok).toBe(false);
    expect(v.rejection).toBe('stale-quote');
    expect(v.message).toMatch(/625\.00/);
  });

  it('detects an item-count mismatch (item removed mid-checkout)', () => {
    const v = validateCheckoutSession({
      cartItemsCount: 2,
      cartTotal: 625,
      quote,
    });
    expect(v.ok).toBe(false);
    expect(v.rejection).toBe('stale-quote');
  });

  it('absorbs float noise within tolerance', () => {
    expect(
      validateCheckoutSession({
        cartItemsCount: 1,
        cartTotal: 625.001,
        quote,
      }).ok,
    ).toBe(true);
  });

  it('a null quote (legacy path) still enforces the cart guards', () => {
    expect(
      validateCheckoutSession({ cartItemsCount: 1, cartTotal: 625, quote: null }).ok,
    ).toBe(true);
    expect(
      validateCheckoutSession({ cartItemsCount: 0, cartTotal: 0, quote: null }).ok,
    ).toBe(false);
  });
});

describe('validateCashTender', () => {
  it('accepts a sufficient tender in the payable currency', () => {
    expect(
      validateCashTender({
        payableTotal: 625,
        payableCurrency: 'KES',
        tenderedAmount: 1000,
        tenderedCurrency: 'KES',
      }),
    ).toEqual({ ok: true });
  });

  it('refuses change calculation against a zero payable (change = full tender case)', () => {
    const v = validateCashTender({
      payableTotal: 0,
      payableCurrency: 'KES',
      tenderedAmount: 1000,
      tenderedCurrency: 'KES',
    });
    expect(v.ok).toBe(false);
    expect(v.message).toMatch(/zero payable/i);
  });

  it('refuses an insufficient tender', () => {
    const v = validateCashTender({
      payableTotal: 625,
      payableCurrency: 'KES',
      tenderedAmount: 500,
      tenderedCurrency: 'KES',
    });
    expect(v.ok).toBe(false);
  });

  it('refuses mixed-currency tender (no implicit conversion)', () => {
    const v = validateCashTender({
      payableTotal: 625,
      payableCurrency: 'KES',
      tenderedAmount: 1000,
      tenderedCurrency: 'AUD',
    });
    expect(v.ok).toBe(false);
    expect(v.message).toMatch(/currency mismatch/i);
  });
});
