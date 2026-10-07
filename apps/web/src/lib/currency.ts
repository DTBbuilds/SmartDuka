/**
 * Currency configuration and utilities for SmartDuka
 * Global multi-currency support (ISO 4217)
 *
 * To add a new currency: add an entry to CURRENCIES below with proper
 * symbol, locale, decimals (per ISO 4217) and Stripe support flag.
 */

export interface CurrencyConfig {
  /** ISO 4217 code (uppercase) */
  code: string;
  /** Display symbol (e.g. "$", "€", "KSh") */
  symbol: string;
  /** Human-readable name */
  name: string;
  /** BCP 47 locale used by Intl.NumberFormat */
  locale: string;
  /** Stripe lower-case code */
  stripeCurrency: string;
  /** Whether Stripe supports charging in this currency natively */
  stripeSupported: boolean;
  /** Number of fractional digits per ISO 4217 */
  decimals: number;
  /** Smallest charge in main currency unit (Stripe minimum or sane default) */
  cardMinimum: number;
  /** Two-letter ISO country code for flag display (primary country) */
  countryCode: string;
  /** Whether the currency is "zero-decimal" for Stripe (charged as integer) */
  zeroDecimal: boolean;
}

/**
 * Comprehensive global currency catalogue.
 * Decimals follow ISO 4217. cardMinimum approximates Stripe minimums
 * (https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts).
 */
export const CURRENCIES: Record<string, CurrencyConfig> = {
  // ===== Africa =====
  // KES: Stripe supports KES as a TWO-decimal currency (docs.stripe.com/currencies —
  // KES is in the supported list and NOT in the zero-decimal list). ISO 4217 display
  // decimals = 2. Charging 100 KES requires amount=10000; amount=100 charges KSh 1.00.
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE', stripeCurrency: 'kes', stripeSupported: true, decimals: 2, cardMinimum: 50, countryCode: 'KE', zeroDecimal: false },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG', stripeCurrency: 'ngn', stripeSupported: true, decimals: 2, cardMinimum: 50, countryCode: 'NG', zeroDecimal: false },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA', stripeCurrency: 'zar', stripeSupported: true, decimals: 2, cardMinimum: 10, countryCode: 'ZA', zeroDecimal: false },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', locale: 'en-GH', stripeCurrency: 'ghs', stripeSupported: false, decimals: 2, cardMinimum: 5, countryCode: 'GH', zeroDecimal: false },
  // UGX: ISO display decimals = 0, but Stripe's backwards-compatibility rule
  // requires API amounts as a two-decimal value ("5 UGX -> amount 500").
  // zeroDecimal:false here means "Stripe API amount = major * 100".
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG', stripeCurrency: 'ugx', stripeSupported: true, decimals: 0, cardMinimum: 2000, countryCode: 'UG', zeroDecimal: false },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'en-TZ', stripeCurrency: 'tzs', stripeSupported: true, decimals: 2, cardMinimum: 1500, countryCode: 'TZ', zeroDecimal: false },
  RWF: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', locale: 'en-RW', stripeCurrency: 'rwf', stripeSupported: true, decimals: 0, cardMinimum: 700, countryCode: 'RW', zeroDecimal: true },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', locale: 'ar-EG', stripeCurrency: 'egp', stripeSupported: true, decimals: 2, cardMinimum: 10, countryCode: 'EG', zeroDecimal: false },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', locale: 'ar-MA', stripeCurrency: 'mad', stripeSupported: true, decimals: 2, cardMinimum: 5, countryCode: 'MA', zeroDecimal: false },
  // ETB is in Stripe's supported currency list (docs.stripe.com/currencies).
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', locale: 'am-ET', stripeCurrency: 'etb', stripeSupported: true, decimals: 2, cardMinimum: 30, countryCode: 'ET', zeroDecimal: false },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', locale: 'fr-SN', stripeCurrency: 'xof', stripeSupported: true, decimals: 0, cardMinimum: 300, countryCode: 'SN', zeroDecimal: true },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', locale: 'fr-CM', stripeCurrency: 'xaf', stripeSupported: true, decimals: 0, cardMinimum: 300, countryCode: 'CM', zeroDecimal: true },

  // ===== Americas =====
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', stripeCurrency: 'usd', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'US', zeroDecimal: false },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', stripeCurrency: 'cad', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'CA', zeroDecimal: false },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', stripeCurrency: 'brl', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'BR', zeroDecimal: false },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX', stripeCurrency: 'mxn', stripeSupported: true, decimals: 2, cardMinimum: 10, countryCode: 'MX', zeroDecimal: false },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', locale: 'es-AR', stripeCurrency: 'ars', stripeSupported: true, decimals: 2, cardMinimum: 100, countryCode: 'AR', zeroDecimal: false },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', locale: 'es-CL', stripeCurrency: 'clp', stripeSupported: true, decimals: 0, cardMinimum: 500, countryCode: 'CL', zeroDecimal: true },
  COP: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', locale: 'es-CO', stripeCurrency: 'cop', stripeSupported: true, decimals: 2, cardMinimum: 2000, countryCode: 'CO', zeroDecimal: false },

  // ===== Europe =====
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', stripeCurrency: 'eur', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'EU', zeroDecimal: false },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', stripeCurrency: 'gbp', stripeSupported: true, decimals: 2, cardMinimum: 0.3, countryCode: 'GB', zeroDecimal: false },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', stripeCurrency: 'chf', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'CH', zeroDecimal: false },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO', stripeCurrency: 'nok', stripeSupported: true, decimals: 2, cardMinimum: 3, countryCode: 'NO', zeroDecimal: false },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE', stripeCurrency: 'sek', stripeSupported: true, decimals: 2, cardMinimum: 3, countryCode: 'SE', zeroDecimal: false },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', locale: 'da-DK', stripeCurrency: 'dkk', stripeSupported: true, decimals: 2, cardMinimum: 2.5, countryCode: 'DK', zeroDecimal: false },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', locale: 'pl-PL', stripeCurrency: 'pln', stripeSupported: true, decimals: 2, cardMinimum: 2, countryCode: 'PL', zeroDecimal: false },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', locale: 'cs-CZ', stripeCurrency: 'czk', stripeSupported: true, decimals: 2, cardMinimum: 15, countryCode: 'CZ', zeroDecimal: false },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', locale: 'hu-HU', stripeCurrency: 'huf', stripeSupported: true, decimals: 2, cardMinimum: 175, countryCode: 'HU', zeroDecimal: false },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', locale: 'ro-RO', stripeCurrency: 'ron', stripeSupported: true, decimals: 2, cardMinimum: 2, countryCode: 'RO', zeroDecimal: false },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR', stripeCurrency: 'try', stripeSupported: true, decimals: 2, cardMinimum: 5, countryCode: 'TR', zeroDecimal: false },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU', stripeCurrency: 'rub', stripeSupported: false, decimals: 2, cardMinimum: 50, countryCode: 'RU', zeroDecimal: false },

  // ===== Asia / Middle East =====
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', stripeCurrency: 'inr', stripeSupported: true, decimals: 2, cardMinimum: 50, countryCode: 'IN', zeroDecimal: false },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', stripeCurrency: 'jpy', stripeSupported: true, decimals: 0, cardMinimum: 50, countryCode: 'JP', zeroDecimal: true },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', stripeCurrency: 'cny', stripeSupported: true, decimals: 2, cardMinimum: 4, countryCode: 'CN', zeroDecimal: false },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'en-HK', stripeCurrency: 'hkd', stripeSupported: true, decimals: 2, cardMinimum: 4, countryCode: 'HK', zeroDecimal: false },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR', stripeCurrency: 'krw', stripeSupported: true, decimals: 0, cardMinimum: 600, countryCode: 'KR', zeroDecimal: true },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', stripeCurrency: 'sgd', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'SG', zeroDecimal: false },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY', stripeCurrency: 'myr', stripeSupported: true, decimals: 2, cardMinimum: 2, countryCode: 'MY', zeroDecimal: false },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID', stripeCurrency: 'idr', stripeSupported: true, decimals: 2, cardMinimum: 7500, countryCode: 'ID', zeroDecimal: false },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', locale: 'en-PH', stripeCurrency: 'php', stripeSupported: true, decimals: 2, cardMinimum: 25, countryCode: 'PH', zeroDecimal: false },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH', stripeCurrency: 'thb', stripeSupported: true, decimals: 2, cardMinimum: 18, countryCode: 'TH', zeroDecimal: false },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Đồng', locale: 'vi-VN', stripeCurrency: 'vnd', stripeSupported: true, decimals: 0, cardMinimum: 12000, countryCode: 'VN', zeroDecimal: true },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', locale: 'en-PK', stripeCurrency: 'pkr', stripeSupported: true, decimals: 2, cardMinimum: 150, countryCode: 'PK', zeroDecimal: false },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD', stripeCurrency: 'bdt', stripeSupported: true, decimals: 2, cardMinimum: 50, countryCode: 'BD', zeroDecimal: false },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE', stripeCurrency: 'aed', stripeSupported: true, decimals: 2, cardMinimum: 2, countryCode: 'AE', zeroDecimal: false },
  SAR: { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal', locale: 'ar-SA', stripeCurrency: 'sar', stripeSupported: true, decimals: 2, cardMinimum: 2, countryCode: 'SA', zeroDecimal: false },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', locale: 'he-IL', stripeCurrency: 'ils', stripeSupported: true, decimals: 2, cardMinimum: 2, countryCode: 'IL', zeroDecimal: false },
  QAR: { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', locale: 'ar-QA', stripeCurrency: 'qar', stripeSupported: true, decimals: 2, cardMinimum: 2, countryCode: 'QA', zeroDecimal: false },

  // ===== Oceania =====
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', stripeCurrency: 'aud', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'AU', zeroDecimal: false },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ', stripeCurrency: 'nzd', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'NZ', zeroDecimal: false },

  // ===== Europe (additional) =====
  // ISK: ISO display decimals = 0, but like UGX Stripe requires the API amount
  // as a two-decimal value ("5 ISK -> amount 500").
  ISK: { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna', locale: 'is-IS', stripeCurrency: 'isk', stripeSupported: true, decimals: 0, cardMinimum: 70, countryCode: 'IS', zeroDecimal: false },
};

/** All supported ISO codes, sorted alphabetically. */
export const SUPPORTED_CURRENCIES: string[] = Object.keys(CURRENCIES).sort();

/** Type alias kept for backward compatibility. Use `string` for new code. */
export type CurrencyCode = keyof typeof CURRENCIES;

/** Default currency used when none configured. */
export const DEFAULT_CURRENCY: CurrencyCode = 'KES';

/**
 * Get currency config by code. Falls back to DEFAULT_CURRENCY when unknown.
 */
export function getCurrencyConfig(code?: string | null): CurrencyConfig {
  if (!code) return CURRENCIES[DEFAULT_CURRENCY];
  const upper = code.toUpperCase();
  return CURRENCIES[upper] || CURRENCIES[DEFAULT_CURRENCY];
}

/**
 * Format a monetary value for display using the locale + symbol of the
 * configured currency. Uses Intl.NumberFormat under the hood for correct
 * separators and decimal handling per locale.
 *
 * @param value - Amount in the main currency unit (e.g. 1765 KES, 25.50 AUD)
 * @param currencyCode - Optional ISO 4217 code; defaults to DEFAULT_CURRENCY.
 */
export function formatMoney(value: number, currencyCode?: string | null): string {
  const config = getCurrencyConfig(currencyCode);
  const safeValue = Number.isFinite(value) ? value : 0;
  let formatted: string;
  try {
    formatted = safeValue.toLocaleString(config.locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  } catch {
    formatted = safeValue.toFixed(config.decimals);
  }
  return `${config.symbol} ${formatted}`;
}

/**
 * Format using Intl currency style (e.g. "$1,234.56", "€1.234,56").
 * Useful when you want native locale-formatted currency rather than
 * a simple `symbol + number` concatenation.
 */
export function formatCurrencyIntl(value: number, currencyCode?: string | null): string {
  const config = getCurrencyConfig(currencyCode);
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return formatMoney(value, currencyCode);
  }
}

/** Currency symbol only (e.g. "KSh", "$", "€"). */
export function getCurrencySymbol(currencyCode?: string | null): string {
  return getCurrencyConfig(currencyCode).symbol;
}

/**
 * Convert main unit to the Stripe API amount (smallest unit per Stripe's
 * semantics — independent of ISO display decimals).
 *
 * Stripe (docs.stripe.com/currencies):
 *   - Default two-decimal: amount = round(major * 100).
 *   - True zero-decimal (amount = major): BIF CLP DJF GNF JPY KMF KRW MGA PYG
 *     RWF VND VUV XAF XOF XPF.
 *   - Special cases UGX and ISK: display zero-decimal but the API amount is a
 *     two-decimal value ("5 UGX -> amount 500", "5 ISK -> amount 500").
 *
 * Unknown codes default to two-decimal (Stripe's global default) — a currency
 * can never inherit another currency's amount semantics via fallback.
 */
export const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG',
  'RWF', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

export function toCents(amount: number, currencyCode?: string | null): number {
  const code = (currencyCode || DEFAULT_CURRENCY).toUpperCase();
  if (STRIPE_ZERO_DECIMAL_CURRENCIES.has(code)) return Math.round(amount);
  return Math.round(amount * 100);
}

/** Convert the Stripe API amount back to main unit. */
export function fromCents(cents: number, currencyCode?: string | null): number {
  const code = (currencyCode || DEFAULT_CURRENCY).toUpperCase();
  if (STRIPE_ZERO_DECIMAL_CURRENCIES.has(code)) return cents;
  return cents / 100;
}

/** Whether amount meets per-currency Stripe minimum. */
export function isAmountSufficientForCard(amount: number, currencyCode?: string | null): boolean {
  const config = getCurrencyConfig(currencyCode);
  return amount >= config.cardMinimum;
}

/** Formatted card minimum, e.g. "$ 0.50" or "KSh 50". */
export function formatCardMinimum(currencyCode?: string | null): string {
  const config = getCurrencyConfig(currencyCode);
  return formatMoney(config.cardMinimum, currencyCode);
}

/** Whether Stripe natively supports this currency for direct charges. */
export function isStripeSupported(currencyCode?: string | null): boolean {
  return getCurrencyConfig(currencyCode).stripeSupported;
}

/**
 * List of currencies suitable for use in dropdowns. Each entry has the
 * full label "USD — US Dollar ($)".
 */
/**
 * Country (ISO 3166-1 alpha-2) → default currency code.
 * Mirrors apps/api/src/common/currency.ts:COUNTRY_DEFAULT_CURRENCY.
 */
export const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  KE: 'KES', NG: 'NGN', ZA: 'ZAR', GH: 'GHS', UG: 'UGX', TZ: 'TZS', RW: 'RWF',
  EG: 'EGP', MA: 'MAD', ET: 'ETB', SN: 'XOF', CM: 'XAF',
  US: 'USD', CA: 'CAD', BR: 'BRL', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP',
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR',
  PT: 'EUR', BE: 'EUR', AT: 'EUR', GR: 'EUR', FI: 'EUR',
  CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', TR: 'TRY', RU: 'RUB',
  IN: 'INR', JP: 'JPY', CN: 'CNY', HK: 'HKD', KR: 'KRW', SG: 'SGD', MY: 'MYR',
  ID: 'IDR', PH: 'PHP', TH: 'THB', VN: 'VND', PK: 'PKR', BD: 'BDT',
  AE: 'AED', SA: 'SAR', IL: 'ILS', QA: 'QAR', IS: 'ISK',
  AU: 'AUD', NZ: 'NZD',
};

export const SUPPORTED_COUNTRIES: string[] = Object.keys(COUNTRY_DEFAULT_CURRENCY).sort();

export function getDefaultCurrencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_DEFAULT_CURRENCY[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}

export const CURRENCY_OPTIONS: Array<{ value: string; label: string; symbol: string }> = Object
  .values(CURRENCIES)
  .map(c => ({
    value: c.code,
    label: `${c.code} — ${c.name} (${c.symbol})`,
    symbol: c.symbol,
  }))
  .sort((a, b) => a.value.localeCompare(b.value));
