/**
 * Redirect only to routes on this SmartDuka origin after sign-in.
 * Never accept absolute or protocol-relative URLs from a query parameter.
 * Authentication and route role authorization remain server-enforced.
 */
export function safeLoginRedirect(requested: string | null, fallback: string): string {
  if (!requested) return fallback;
  const value = requested.trim();
  if (!value.startsWith('/') ||
      value.startsWith('//') ||
      value.startsWith('/\\') ||
      /[\u0000-\u001f\\]/.test(value) ||
      /^\/%(?:2f|5c)/i.test(value)) {
    return fallback;
  }
  try {
    const target = new URL(value, 'https://smartduka.invalid');
    if (target.origin !== 'https://smartduka.invalid') return fallback;
  } catch {
    return fallback;
  }
  return value;
}
