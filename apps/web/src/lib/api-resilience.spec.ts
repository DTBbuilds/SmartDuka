/**
 * ERROR-UX-RELIABILITY1 (PR A) — resilience + api-client regression tests.
 *
 * P0 behaviors proven:
 *  - POST/PATCH/PUT/DELETE are NEVER auto-retried (a timeout/network error
 *    after the server received the request must not duplicate financial or
 *    destructive operations);
 *  - GET/HEAD/OPTIONS still retry;
 *  - the caller's AbortSignal is honored (navigation cancellation works);
 *  - a timeout is not retried and reports honestly;
 *  - non-JSON/HTML error bodies become proper ApiErrors (no SyntaxError);
 *  - 401 throws a typed error — never a fake successful empty response.
 */
import { apiResilience } from './api-resilience';

const flush = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ERROR-UX-RELIABILITY1 PR A — api-resilience retry safety', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    apiResilience.reset();
    (globalThis as any).navigator = { ...(globalThis as any).navigator, onLine: true };
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete (globalThis as any).navigator;
  });

  it('POST is NOT retried when the network fails (no duplicate submission)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(
      apiResilience.resilientFetch('https://api.test/sales/checkout', {
        method: 'POST',
      }),
    ).rejects.toThrow('network down');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('PATCH/PUT/DELETE are NOT retried either', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    for (const method of ['PATCH', 'PUT', 'DELETE']) {
      fetchMock.mockClear();
      await expect(
        apiResilience.resilientFetch('https://api.test/x', { method }),
      ).rejects.toThrow('network down');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it('GET is retried and succeeds on a later attempt', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const res = await apiResilience.resilientFetch('https://api.test/x', {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a caller abort (navigation/cancel) is respected and never retried', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('canceled'), { name: 'AbortError' })),
          );
        }),
    );

    const caller = new AbortController();
    const promise = apiResilience.resilientFetch('https://api.test/x', {
      method: 'GET',
      signal: caller.signal,
    });
    caller.abort();

    await expect(promise).rejects.toThrow('canceled');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a timeout is NOT retried (the request may have reached the server)', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('canceled'), { name: 'AbortError' })),
          );
        }),
    );

    await expect(
      apiResilience.resilientFetch(
        'https://api.test/sales/checkout',
        { method: 'POST' },
        { timeoutMs: 30 },
      ),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POST succeeds when explicitly opted in as retryable (idempotent/keyed operations)', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const res = await apiResilience.resilientFetch(
      'https://api.test/x',
      { method: 'POST', retryOnNonIdempotent: true },
      { timeoutMs: 50 },
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('4xx responses are returned as-is (never retried, never thrown by this layer)', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"no"}', { status: 400 }));

    const res = await apiResilience.resilientFetch('https://api.test/x', {
      method: 'GET',
    });

    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('ERROR-UX-RELIABILITY1 PR A — api-client error normalization', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    apiResilience.reset();
    // Minimal browser-ish environment for the client's storage access.
    const mkStore = () => {
      const m = new Map<string, string>();
      return {
        getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
        setItem: (k: string, v: string) => void m.set(k, v),
        removeItem: (k: string) => void m.delete(k),
        clear: () => void m.clear(),
      };
    };
    (globalThis as any).localStorage = mkStore();
    (globalThis as any).sessionStorage = mkStore();
    // A CSRF token in storage short-circuits getCsrfToken before its
    // document.cookie fallback.
    (globalThis as any).localStorage.setItem('smartduka:csrf', 'test-csrf');
    (globalThis as any).document = { cookie: '' };
    (globalThis as any).navigator = { ...(globalThis as any).navigator, onLine: true };
    (globalThis as any).window = {
      location: { pathname: '/admin', href: '' },
    };
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
    delete (globalThis as any).document;
    delete (globalThis as any).navigator;
    delete (globalThis as any).window;
  });

  async function bootClient() {
    const mod = await import('./api-client');
    return mod.api;
  }

  it('a non-JSON 502 gateway body becomes a proper ApiError (no SyntaxError)', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>502 Bad Gateway</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }),
    );

    const api = await bootClient();
    await expect(api.get('/shops')).rejects.toMatchObject({
      statusCode: 502,
      error: 'BAD_GATEWAY',
      message: 'Service temporarily unavailable. Please try again.',
    });
  });

  it('401 throws a typed auth error — never a fake successful empty response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
    );

    const api = await bootClient();
    await expect(api.get('/users')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Your session has expired. Please sign in again.',
    });
  });

  it('Nest validation arrays are joined into one readable message', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: ['name should not be empty', 'email must be an email'],
          statusCode: 400,
        }),
        { status: 400 },
      ),
    );

    const api = await bootClient();
    await expect(api.post('/users', {})).rejects.toMatchObject({
      statusCode: 400,
      message: 'name should not be empty, email must be an email',
    });
  });

  it('the canonical error code is surfaced for machine-readable handling', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'Limit reached', code: 'FORBIDDEN', statusCode: 403 }),
        { status: 403 },
      ),
    );

    const api = await bootClient();
    await expect(api.post('/branches', {})).rejects.toMatchObject({
      statusCode: 403,
      error: 'FORBIDDEN',
      message: 'Limit reached',
    });
  });

  it('a timeout reports honestly about possible completion (POST not retried)', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('canceled'), { name: 'AbortError' })),
          );
        }),
    );

    const api = await bootClient();
    await expect(api.post('/sales/checkout', { items: [] }, { timeoutMs: 40 })).rejects.toMatchObject({
      statusCode: 0,
      error: 'TIMEOUT',
      message: expect.stringMatching(/took too long/i),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
