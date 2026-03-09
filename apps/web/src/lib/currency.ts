/**
 * Currency configuration and utilities for SmartDuka
 * Supports KES (Kenyan Shillings) and AUD (Australian Dollars)
 */

export type CurrencyCode = 'KES' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  /** Stripe currency code (lowercase) */
  stripeCurrency: string;
  /** Number of decimal places for display */
  decimals: number;
  /** Minimum amount for card payments (in main currency unit, not cents) */
  cardMinimum: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    locale: 'en-KE',
    stripeCurrency: 'kes',
    decimals: 0,
    cardMinimum: 50,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    locale: 'en-AU',
    stripeCurrency: 'aud',
    decimals: 2,
    cardMinimum: 1,
  },
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['KES', 'AUD'];

/**
 * Get currency config by code, defaults to KES
 */
export function getCurrencyConfig(code?: string | null): CurrencyConfig {
  if (!code) return CURRENCIES.KES;
  const upper = code.toUpperCase() as CurrencyCode;
  return CURRENCIES[upper] || CURRENCIES.KES;
}

/**
 * Format a monetary value for display
 * @param value - Amount in main currency unit (e.g. 1765 KES, 25.50 AUD)
 * @param currencyCode - Currency code (KES or AUD)
 */
export function formatMoney(value: number, currencyCode?: string | null): string {
  const config = getCurrencyConfig(currencyCode);
  const formatted = value.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });
  return `${config.symbol} ${formatted}`;
}

/**
 * Convert main unit to smallest currency unit (cents) for Stripe
 * @param amount - Amount in main currency unit
 * @param currencyCode - Currency code
 */
export function toCents(amount: number, currencyCode?: string | null): number {
  return Math.round(amount * 100);
}

/**
 * Convert smallest currency unit (cents) to main unit
 */
export function fromCents(cents: number, currencyCode?: string | null): number {
  return cents / 100;
}

/**
 * Check if amount meets minimum for card payment
 */
export function isAmountSufficientForCard(amount: number, currencyCode?: string | null): boolean {
  const config = getCurrencyConfig(currencyCode);
  return amount >= config.cardMinimum;
}

/**
 * Get formatted minimum amount for card payment
 */
export function formatCardMinimum(currencyCode?: string | null): string {
  const config = getCurrencyConfig(currencyCode);
  return formatMoney(config.cardMinimum, currencyCode);
}
