// P1-13A — API-side country-aware phone validation.
// Mirrors apps/web/src/lib/phone-validation.ts (the same rule set) so
// backend validation is AUTHORITATIVE and accepts exactly what the
// frontend accepts — no valid supported-country number is rejected.
//
// Replaces the hardcoded KE/AU regexes in register-shop: valid users
// from every supported registration country were rejected. The backend
// (auth/dto/register-shop.dto.ts) validates length only (10–15 chars),
// so these rules are strictly compatible — no valid supported-country
// number is rejected by either side.
//
// Rules are MOBILE-focused: the phone is required for M-Pesa and
// business contact. Formats accepted per country: national (leading
// trunk 0), international (+CC / 00CC / bare CC), with spaces, dashes
// and parentheses ignored. The entered value is NOT rewritten — the
// payload keeps what the user typed.

export interface PhoneRule {
  /** Country calling code, no plus. */
  code: string;
  /** National significant number pattern (mobile), no trunk zero. */
  pattern: RegExp;
  /** Human example shown in the error message. */
  example: string;
}

export const PHONE_RULES: Record<string, PhoneRule> = {
  KE: { code: '254', pattern: /^[17]\d{8}$/, example: '0712345678' },
  NG: { code: '234', pattern: /^[789]\d{9}$/, example: '08031234567' },
  ZA: { code: '27', pattern: /^[678]\d{8}$/, example: '0712345678' },
  GH: { code: '233', pattern: /^[235]\d{8}$/, example: '0244123456' },
  UG: { code: '256', pattern: /^[79]\d{8}$/, example: '0772123456' },
  TZ: { code: '255', pattern: /^[67]\d{8}$/, example: '0712345678' },
  RW: { code: '250', pattern: /^[79]\d{8}$/, example: '0781234567' },
  EG: { code: '20', pattern: /^1[0125]\d{8}$/, example: '01001234567' },
  MA: { code: '212', pattern: /^[67]\d{8}$/, example: '0612345678' },
  ET: { code: '251', pattern: /^[79]\d{8}$/, example: '0911234567' },
  SN: { code: '221', pattern: /^7[05678]\d{7}$/, example: '771234567' },
  CM: { code: '237', pattern: /^6[5789]\d{7}$/, example: '671234567' },
  US: { code: '1', pattern: /^[2-9]\d{9}$/, example: '(555) 123-4567' },
  CA: { code: '1', pattern: /^[2-9]\d{9}$/, example: '(416) 123-4567' },
  BR: { code: '55', pattern: /^[1-9]\d{9,10}$/, example: '11 91234 5678' },
  MX: { code: '52', pattern: /^\d{10}$/, example: '55 1234 5678' },
  AR: { code: '54', pattern: /^[1-9]\d{9,10}$/, example: '11 2345 6789' },
  CL: { code: '56', pattern: /^[29]\d{8}$/, example: '9 1234 5678' },
  CO: { code: '57', pattern: /^3\d{9}$/, example: '312 345 6789' },
  GB: { code: '44', pattern: /^[127]\d{8,9}$/, example: '07400 123456' },
  DE: { code: '49', pattern: /^[1-9]\d{6,11}$/, example: '0151 23456789' },
  FR: { code: '33', pattern: /^[67]\d{8}$/, example: '06 12 34 56 78' },
  IT: { code: '39', pattern: /^3\d{8,9}$/, example: '312 345 6789' },
  ES: { code: '34', pattern: /^[6789]\d{8}$/, example: '612 34 56 78' },
  NL: { code: '31', pattern: /^[1-9]\d{8}$/, example: '06 12345678' },
  CH: { code: '41', pattern: /^[2-9]\d{8}$/, example: '078 123 45 67' },
  NO: { code: '47', pattern: /^[2-9]\d{7}$/, example: '406 12 345' },
  SE: { code: '46', pattern: /^[1-9]\d{7,9}$/, example: '070 123 45 67' },
  DK: { code: '45', pattern: /^[2-9]\d{7}$/, example: '32 12 34 56' },
  PL: { code: '48', pattern: /^[456789]\d{8}$/, example: '512 345 678' },
  CZ: { code: '420', pattern: /^[2-9]\d{8}$/, example: '601 123 456' },
  IN: { code: '91', pattern: /^[6-9]\d{9}$/, example: '98765 43210' },
  JP: { code: '81', pattern: /^[1-9]\d{8,9}$/, example: '090 1234 5678' },
  CN: { code: '86', pattern: /^1[3-9]\d{9}$/, example: '131 2345 6789' },
  HK: { code: '852', pattern: /^[23456789]\d{7}$/, example: '5123 4567' },
  SG: { code: '65', pattern: /^[689]\d{7}$/, example: '8123 4567' },
  AE: { code: '971', pattern: /^5[0245678]\d{7}$/, example: '050 123 4567' },
  SA: { code: '966', pattern: /^5\d{8}$/, example: '050 123 4567' },
  AU: { code: '61', pattern: /^4\d{8}$/, example: '0412 345 678' },
  NZ: { code: '64', pattern: /^[2]\d{7,9}$/, example: '021 123 4567' },
};

export interface PhoneValidationResult {
  valid: boolean;
  /** The cleaned digits (spaces/dashes/parens removed) — not rewritten to E.164. */
  cleaned?: string;
  error?: string;
}

/**
 * Validate a phone number for the SELECTED country.
 * Accepts national (trunk 0), international (+CC, 00CC, bare CC) forms.
 */
export function validatePhoneForCountry(
  countryCode: string | undefined,
  raw: string,
): PhoneValidationResult {
  const rule = countryCode ? PHONE_RULES[countryCode.toUpperCase()] : undefined;
  if (!rule) {
    // Unknown country: fall back to a conservative international check
    // (7–15 digits) so no valid number is silently rejected.
    const cleaned = raw.replace(/[\s\-().]/g, '');
    if (!cleaned) return { valid: false, error: 'Phone number is required' };
    if (!/^\+?\d{7,15}$/.test(cleaned)) {
      return { valid: false, error: 'Please enter a valid phone number' };
    }
    return { valid: true, cleaned };
  }

  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned) {
    return { valid: false, error: 'Phone number is required' };
  }
  if (!/^\+?\d+$/.test(cleaned)) {
    return {
      valid: false,
      error: `Please enter digits only (e.g., ${rule.example})`,
    };
  }

  let national = cleaned;
  // International prefix forms: +CC…, 00CC…, bare CC…
  if (national.startsWith('+')) national = national.slice(1);
  if (national.startsWith('00')) national = national.slice(2);
  if (national.startsWith(rule.code)) {
    const rest = national.slice(rule.code.length);
    if (rest.length >= 7) national = rest;
  }
  // National trunk zero
  if (national.startsWith('0')) national = national.slice(1);

  if (!rule.pattern.test(national)) {
    return {
      valid: false,
      error: `Please enter a valid ${countryCode} phone number (e.g., ${rule.example})`,
    };
  }
  return { valid: true, cleaned };
}
