/**
 * POS-CURRENCY-CHECKOUT-P0 — checkout session validation.
 *
 * The canonical checkout quote is frozen when the cashier starts checkout.
 * Every subsequent step (payment-method modal, confirmation modal,
 * submission) must agree with it. Pure functions so the guards are unit
 * testable and identical across call sites.
 */
export interface CheckoutQuote {
  itemCount: number;
  total: number;
  currency?: string;
}

export type CheckoutSessionRejection =
  | 'empty-cart'
  | 'zero-total'
  | 'stale-quote';

export interface CheckoutSessionVerdict {
  ok: boolean;
  rejection?: CheckoutSessionRejection;
  /** Human-facing explanation for the rejection. */
  message?: string;
}

/** Tolerance for float noise only — real differences are business events. */
const QUOTE_TOLERANCE = 0.005;

export function validateCheckoutSession(params: {
  cartItemsCount: number;
  cartTotal: number;
  quote: CheckoutQuote | null;
}): CheckoutSessionVerdict {
  const { cartItemsCount, cartTotal, quote } = params;

  if (cartItemsCount === 0) {
    return {
      ok: false,
      rejection: 'empty-cart',
      message:
        'The cart is empty. Nothing was submitted — add items before checking out.',
    };
  }
  if (!(cartTotal > 0)) {
    return {
      ok: false,
      rejection: 'zero-total',
      message:
        'The payable amount is zero. Nothing was submitted — a checkout needs a positive total.',
    };
  }
  if (
    quote &&
    (quote.itemCount !== cartItemsCount ||
      Math.abs(quote.total - cartTotal) > QUOTE_TOLERANCE)
  ) {
    return {
      ok: false,
      rejection: 'stale-quote',
      message: `The cart no longer matches the confirmed quote (${quote.total.toFixed(2)}). Review the cart and restart checkout. Nothing was submitted.`,
    };
  }
  return { ok: true };
}

/**
 * Change is only meaningful against a positive payable in a known currency.
 * The tendered amount must be in the SAME currency as the payable — mixed
 * currency checkout requires an explicitly designed conversion workflow and
 * is refused here.
 */
export function validateCashTender(params: {
  payableTotal: number;
  payableCurrency?: string;
  tenderedAmount: number;
  tenderedCurrency?: string;
}): CheckoutSessionVerdict {
  const { payableTotal, payableCurrency, tenderedAmount, tenderedCurrency } =
    params;

  if (!(payableTotal > 0)) {
    return {
      ok: false,
      rejection: 'zero-total',
      message: 'Change cannot be calculated against a zero payable.',
    };
  }
  if (
    tenderedCurrency &&
    payableCurrency &&
    tenderedCurrency !== payableCurrency
  ) {
    return {
      ok: false,
      rejection: 'stale-quote',
      message: `Currency mismatch: the payable is ${payableCurrency} but the tender is ${tenderedCurrency}. Mixed-currency checkout is not supported.`,
    };
  }
  if (!(tenderedAmount >= payableTotal)) {
    return {
      ok: false,
      rejection: 'zero-total',
      message: 'The tendered amount does not cover the payable.',
    };
  }
  return { ok: true };
}
