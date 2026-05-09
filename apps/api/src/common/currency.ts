/**
 * Backend currency utility - mirrors apps/web/src/lib/currency.ts
 *
 * Single source of truth for currency metadata on the API side.
 * Used by receipt/invoice/email formatters to render amounts in
 * the shop's configured currency (instead of hardcoded "Ksh").
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
  /** Smallest charge in main currency unit */
  cardMinimum: number;
  /** Two-letter ISO country code (primary) */
  countryCode: string;
  /** Whether the currency is "zero-decimal" for Stripe */
  zeroDecimal: boolean;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  // Africa
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE', stripeCurrency: 'kes', stripeSupported: false, decimals: 0, cardMinimum: 50, countryCode: 'KE', zeroDecimal: true },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG', stripeCurrency: 'ngn', stripeSupported: true, decimals: 2, cardMinimum: 50, countryCode: 'NG', zeroDecimal: false },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA', stripeCurrency: 'zar', stripeSupported: true, decimals: 2, cardMinimum: 10, countryCode: 'ZA', zeroDecimal: false },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', locale: 'en-GH', stripeCurrency: 'ghs', stripeSupported: false, decimals: 2, cardMinimum: 5, countryCode: 'GH', zeroDecimal: false },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG', stripeCurrency: 'ugx', stripeSupported: true, decimals: 0, cardMinimum: 2000, countryCode: 'UG', zeroDecimal: true },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'en-TZ', stripeCurrency: 'tzs', stripeSupported: true, decimals: 2, cardMinimum: 1500, countryCode: 'TZ', zeroDecimal: false },
  RWF: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', locale: 'en-RW', stripeCurrency: 'rwf', stripeSupported: true, decimals: 0, cardMinimum: 700, countryCode: 'RW', zeroDecimal: true },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', locale: 'ar-EG', stripeCurrency: 'egp', stripeSupported: true, decimals: 2, cardMinimum: 10, countryCode: 'EG', zeroDecimal: false },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', locale: 'ar-MA', stripeCurrency: 'mad', stripeSupported: true, decimals: 2, cardMinimum: 5, countryCode: 'MA', zeroDecimal: false },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', locale: 'am-ET', stripeCurrency: 'etb', stripeSupported: false, decimals: 2, cardMinimum: 30, countryCode: 'ET', zeroDecimal: false },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', locale: 'fr-SN', stripeCurrency: 'xof', stripeSupported: true, decimals: 0, cardMinimum: 300, countryCode: 'SN', zeroDecimal: true },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', locale: 'fr-CM', stripeCurrency: 'xaf', stripeSupported: true, decimals: 0, cardMinimum: 300, countryCode: 'CM', zeroDecimal: true },

  // Americas
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', stripeCurrency: 'usd', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'US', zeroDecimal: false },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', stripeCurrency: 'cad', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'CA', zeroDecimal: false },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', stripeCurrency: 'brl', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'BR', zeroDecimal: false },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX', stripeCurrency: 'mxn', stripeSupported: true, decimals: 2, cardMinimum: 10, countryCode: 'MX', zeroDecimal: false },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', locale: 'es-AR', stripeCurrency: 'ars', stripeSupported: true, decimals: 2, cardMinimum: 100, countryCode: 'AR', zeroDecimal: false },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', locale: 'es-CL', stripeCurrency: 'clp', stripeSupported: true, decimals: 0, cardMinimum: 500, countryCode: 'CL', zeroDecimal: true },
  COP: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', locale: 'es-CO', stripeCurrency: 'cop', stripeSupported: true, decimals: 2, cardMinimum: 2000, countryCode: 'CO', zeroDecimal: false },

  // Europe
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

  // Asia / Middle East
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

  // Oceania
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', stripeCurrency: 'aud', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'AU', zeroDecimal: false },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ', stripeCurrency: 'nzd', stripeSupported: true, decimals: 2, cardMinimum: 0.5, countryCode: 'NZ', zeroDecimal: false },
};

export const SUPPORTED_CURRENCIES: string[] = Object.keys(CURRENCIES).sort();
export const DEFAULT_CURRENCY = 'KES';

export function getCurrencyConfig(code?: string | null): CurrencyConfig {
  if (!code) return CURRENCIES[DEFAULT_CURRENCY];
  const upper = code.toUpperCase();
  return CURRENCIES[upper] || CURRENCIES[DEFAULT_CURRENCY];
}

/**
 * Format a monetary value as "<symbol> <number>" using the locale of the
 * configured currency. Mirrors apps/web/src/lib/currency.ts:formatMoney.
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

/** Native Intl currency-style format (e.g. "$1,234.56", "€1.234,56"). */
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

export function getCurrencySymbol(currencyCode?: string | null): string {
  return getCurrencyConfig(currencyCode).symbol;
}

export function toCents(amount: number, currencyCode?: string | null): number {
  const config = getCurrencyConfig(currencyCode);
  if (config.zeroDecimal) return Math.round(amount);
  return Math.round(amount * 100);
}

export function fromCents(cents: number, currencyCode?: string | null): number {
  const config = getCurrencyConfig(currencyCode);
  if (config.zeroDecimal) return cents;
  return cents / 100;
}

export function isStripeSupported(currencyCode?: string | null): boolean {
  return getCurrencyConfig(currencyCode).stripeSupported;
}

/**
 * Country (ISO 3166-1 alpha-2) → default currency code (ISO 4217).
 * Used at registration to auto-select the right currency. Users can
 * override the default currency at registration / in settings.
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
  AE: 'AED', SA: 'SAR', IL: 'ILS', QA: 'QAR',
  AU: 'AUD', NZ: 'NZD',
};

export const SUPPORTED_COUNTRIES: string[] = Object.keys(COUNTRY_DEFAULT_CURRENCY).sort();

export function getDefaultCurrencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_DEFAULT_CURRENCY[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
}
