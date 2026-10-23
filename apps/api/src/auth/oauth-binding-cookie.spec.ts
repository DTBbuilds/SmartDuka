import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CookieService } from './services/cookie.service';

/**
 * OAUTH-COOKIE-FIX1 — browser-binding cookie attribute policy.
 *
 * The binding cookie must survive the browser's cookie policy for the
 * deployment topology it runs in:
 *   - cross-origin (API on a different site): SameSite=None + Secure —
 *     sent only by browsers that still allow third-party cookies;
 *   - same-site subdomain (COOKIE_DOMAIN set, e.g. .smartduka.org with
 *     api.smartduka.org): SameSite=Lax + Secure + Domain — sent by EVERY
 *     browser, including Safari ITP / Brave / Chrome incognito;
 *   - development: Lax, not Secure, host-only (localhost cross-port).
 *
 * These attributes are exactly what browsers enforce, so asserting them
 * is the automatable proxy for cross-browser cookie behaviour.
 */

type CookieCall = [string, string, Record<string, unknown>];

const makeRes = (): { res: Response; calls: CookieCall[] } => {
  const calls: CookieCall[] = [];
  const res = {
    cookie: (name: string, value: string, opts: Record<string, unknown>) => {
      calls.push([name, value, opts]);
    },
  } as unknown as Response;
  return { res, calls };
};

const makeSvc = (env: {
  NODE_ENV?: string;
  COOKIE_DOMAIN?: string;
}): CookieService => {
  const configService = {
    get: (key: string) => env[key as keyof typeof env],
  } as unknown as ConfigService;
  return new CookieService(configService);
};

describe('OAUTH-COOKIE-FIX1 — oauth_bind cookie attribute policy', () => {
  it('production WITHOUT COOKIE_DOMAIN (current topology): SameSite=None + Secure, host-only', () => {
    const svc = makeSvc({ NODE_ENV: 'production' });
    const { res, calls } = makeRes();
    svc.setOAuthBindingCookie(res, 'nonce-abc');
    expect(calls).toHaveLength(1);
    const [name, value, opts] = calls[0];
    expect(name).toBe('oauth_bind');
    expect(value).toBe('nonce-abc');
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('none');
    expect(opts.domain).toBeUndefined();
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(120_000);
  });

  it('production WITH COOKIE_DOMAIN (same-site subdomain cutover): SameSite=Lax + Secure + Domain — sent by all browsers', () => {
    const svc = makeSvc({ NODE_ENV: 'production', COOKIE_DOMAIN: '.smartduka.org' });
    const { res, calls } = makeRes();
    svc.setOAuthBindingCookie(res, 'nonce-abc');
    const [, , opts] = calls[0];
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.domain).toBe('.smartduka.org');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(120_000);
  });

  it('development: Lax, not Secure, host-only (localhost cross-port)', () => {
    const svc = makeSvc({ NODE_ENV: 'development' });
    const { res, calls } = makeRes();
    svc.setOAuthBindingCookie(res, 'nonce-abc');
    const [, , opts] = calls[0];
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe('lax');
    expect(opts.domain).toBeUndefined();
  });

  it('binding cookie is HttpOnly in every mode (never JS-readable)', () => {
    for (const env of [
      { NODE_ENV: 'production' },
      { NODE_ENV: 'production', COOKIE_DOMAIN: '.smartduka.org' },
      { NODE_ENV: 'development' },
    ]) {
      const svc = makeSvc(env);
      const { res, calls } = makeRes();
      svc.setOAuthBindingCookie(res, 'n');
      expect(calls[0][2].httpOnly).toBe(true);
    }
  });
});
