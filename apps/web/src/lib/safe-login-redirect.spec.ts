import { safeLoginRedirect } from './safe-login-redirect';

describe('shop sign-in redirect safety', () => {
  it('preserves normal internal retail routes and query strings', () => {
    expect(safeLoginRedirect('/pos', '/admin')).toBe('/pos');
    expect(safeLoginRedirect('/orders?status=pending', '/admin')).toBe('/orders?status=pending');
    expect(safeLoginRedirect('/cashier/dashboard', '/admin')).toBe('/cashier/dashboard');
  });

  it('uses role fallback when no destination was provided', () => {
    expect(safeLoginRedirect(null, '/admin')).toBe('/admin');
    expect(safeLoginRedirect('', '/pos')).toBe('/pos');
  });

  it('rejects absolute URLs, protocol-relative URLs and backslash escapes', () => {
    for (const value of [
      'https://example.org', 'javascript:alert(1)',
      '//example.org', '/\\example.org', '/%2fexample.org',
      '/%5cexample.org', ' /\\example.org', '\n//example.org',
    ]) {
      expect(safeLoginRedirect(value, '/admin')).toBe('/admin');
    }
  });
});
