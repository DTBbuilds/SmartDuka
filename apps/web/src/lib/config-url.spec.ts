/**
 * API-URL-RECOVERY1 — API URL generation regression tests.
 *
 * Convention (verified against the NestJS global prefix in apps/api):
 *   NEXT_PUBLIC_API_URL = BARE API origin (no /api/v1, no trailing slash).
 *   config.apiUrl      = origin + /api/v1   (versioned routes)
 *   config.apiBaseUrl  = origin             (unversioned: /ping, /health/*)
 *
 * Incident: production set NEXT_PUBLIC_API_URL WITH a /api/v1 suffix,
 * producing /api/v1/ping (404) and /api/v1/api/v1/... for every versioned
 * call. These tests pin the normalization so neither can ever recur.
 */

type ConfigModule = {
  normalizeApiOrigin: (url: string) => string;
  config: { apiUrl: string; apiBaseUrl: string };
};

const loadWithEnv = (apiUrl?: string): ConfigModule['config'] => {
  jest.resetModules();
  if (apiUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = apiUrl;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod: ConfigModule = require('./config');
  return mod.config;
};

describe('normalizeApiOrigin', () => {
  const { normalizeApiOrigin } = require('./config') as ConfigModule;

  it('keeps a bare origin untouched', () => {
    expect(normalizeApiOrigin('https://api.smartduka.org')).toBe('https://api.smartduka.org');
    expect(normalizeApiOrigin('http://localhost:5000')).toBe('http://localhost:5000');
  });

  it('strips a trailing /api/v1 suffix', () => {
    expect(normalizeApiOrigin('https://api.smartduka.org/api/v1')).toBe('https://api.smartduka.org');
  });

  it('strips repeated suffixes and trailing slashes', () => {
    expect(normalizeApiOrigin('https://api.smartduka.org/api/v1/')).toBe('https://api.smartduka.org');
    expect(normalizeApiOrigin('https://api.smartduka.org/api/v1/api/v1')).toBe('https://api.smartduka.org');
    expect(normalizeApiOrigin('https://api.smartduka.org/')).toBe('https://api.smartduka.org');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeApiOrigin('  https://api.smartduka.org/api/v1 ')).toBe('https://api.smartduka.org');
  });
});

describe('config URL generation (no duplicate or incorrect prefixes)', () => {
  it('bare origin: apiUrl = origin + /api/v1, apiBaseUrl = origin', () => {
    const cfg = loadWithEnv('https://api.smartduka.org');
    expect(cfg.apiBaseUrl).toBe('https://api.smartduka.org');
    expect(cfg.apiUrl).toBe('https://api.smartduka.org/api/v1');
  });

  it('SUFFIXED origin (the production incident value): normalized to the same result', () => {
    const cfg = loadWithEnv('https://api.smartduka.org/api/v1');
    expect(cfg.apiBaseUrl).toBe('https://api.smartduka.org');
    expect(cfg.apiUrl).toBe('https://api.smartduka.org/api/v1');
  });

  it('suffixed + trailing slash: normalized to the same result', () => {
    const cfg = loadWithEnv('https://api.smartduka.org/api/v1/');
    expect(cfg.apiBaseUrl).toBe('https://api.smartduka.org');
    expect(cfg.apiUrl).toBe('https://api.smartduka.org/api/v1');
  });

  it('apiUrl never contains a duplicated /api/v1 segment', () => {
    for (const value of [
      'https://api.smartduka.org',
      'https://api.smartduka.org/api/v1',
      'https://api.smartduka.org/api/v1/',
      'https://smartduka-91q6.onrender.com',
    ]) {
      const cfg = loadWithEnv(value);
      expect(cfg.apiUrl).not.toMatch(/api\/v1\/api\/v1/);
      expect(cfg.apiBaseUrl).not.toMatch(/api\/v1$/);
    }
  });

  it('unset env: production fallback is the live API host', () => {
    const cfg = loadWithEnv(undefined);
    expect(cfg.apiBaseUrl).toBe('https://smartduka-91q6.onrender.com');
    expect(cfg.apiUrl).toBe('https://smartduka-91q6.onrender.com/api/v1');
  });

  it('unversioned endpoints resolve to real routes (ping/health live at the origin, not under /api/v1)', () => {
    const cfg = loadWithEnv('https://api.smartduka.org/api/v1');
    expect(`${cfg.apiBaseUrl}/ping`).toBe('https://api.smartduka.org/ping');
    expect(`${cfg.apiBaseUrl}/health/live`).toBe('https://api.smartduka.org/health/live');
  });
});
