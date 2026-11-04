import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { RequestIdMiddleware } from '../middleware/request-id.middleware';

/**
 * ERROR-UX-RELIABILITY1 (PR A/B) — canonical error contract regression.
 *
 * P0 safety: unhandled (non-HttpException) errors must NEVER disclose their
 * raw internal message (DB duplicate-key details, cast errors, driver
 * fragments) to the client. Every response carries a stable machine-readable
 * `code` and the correlation `requestId` (matching the x-request-id header).
 * The legacy fields (statusCode/timestamp/path/method/message/errors) are
 * preserved for backward compatibility.
 */
describe('ERROR-UX-RELIABILITY1 — canonical exception filter', () => {
  let filter: AllExceptionsFilter;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let sentBody: any;

  const host = () => ({
    switchToHttp: () => ({
      getResponse: () => ({
        headersSent: false,
        status: statusMock,
        json: jsonMock,
      }),
      getRequest: () =>
        ({
          method: 'POST',
          url: '/api/v1/test',
          requestId: 'req-123',
        }) as any,
    }),
  }) as any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    sentBody = undefined;
    statusMock = jest.fn().mockReturnValue({ json: (b: any) => (sentBody = b) });
    jsonMock = jest.fn().mockImplementation((b) => (sentBody = b));
  });

  it('unhandled Error: generic message only — raw internal message NEVER disclosed', () => {
    filter.catch(
      new Error(
        'E11000 duplicate key error collection: smartduka.users index: email_1 dup key: { email: "x" }',
      ),
      host(),
    );

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(sentBody.message).toBe('Internal server error. Please try again.');
    expect(sentBody.message).not.toMatch(/E11000|duplicate key|smartduka/i);
    expect(sentBody.code).toBe('INTERNAL_ERROR');
    expect(sentBody.requestId).toBe('req-123');
    expect(sentBody.statusCode).toBe(500);
    expect(sentBody.path).toBe('/api/v1/test');
    expect(sentBody.method).toBe('POST');
    expect(sentBody.timestamp).toBeTruthy();
  });

  it('HttpException string message is preserved (business message)', () => {
    filter.catch(
      new HttpException('Branch code already exists in this shop', 400),
      host(),
    );

    expect(sentBody.statusCode).toBe(400);
    expect(sentBody.message).toBe('Branch code already exists in this shop');
    expect(sentBody.code).toBe('VALIDATION_ERROR');
  });

  it('explicit business errorCode wins over the status-derived code', () => {
    filter.catch(
      new HttpException(
        { message: 'Limit reached', errorCode: 'MPESA_007' },
        HttpStatus.FORBIDDEN,
      ),
      host(),
    );

    expect(sentBody.code).toBe('MPESA_007');
    expect(sentBody.message).toBe('Limit reached');
    expect(sentBody.statusCode).toBe(403);
  });

  it('validation arrays produce structured field errors + joined message', () => {
    filter.catch(
      new HttpException(
        { message: ['name should not be empty', 'email must be an email'] },
        HttpStatus.BAD_REQUEST,
      ),
      host(),
    );

    expect(sentBody.errors).toEqual([
      'name should not be empty',
      'email must be an email',
    ]);
    expect(sentBody.message).toBe('name should not be empty, email must be an email');
    expect(sentBody.code).toBe('VALIDATION_ERROR');
  });

  it('429 and 5xx responses carry retryable metadata; 4xx do not', () => {
    filter.catch(
      new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS),
      host(),
    );
    expect(sentBody.retryable).toBe(true);
    expect(sentBody.code).toBe('RATE_LIMITED');

    statusMock = jest.fn().mockReturnValue({ json: (b: any) => (sentBody = b) });
    filter.catch(
      new HttpException('Forbidden', HttpStatus.FORBIDDEN),
      host(),
    );
    expect(sentBody.retryable).toBeUndefined();
    expect(sentBody.code).toBe('FORBIDDEN');
  });

  it('status codes without a dedicated map entry still get a stable code', () => {
    filter.catch(new HttpException('Teapot', 418), host());
    expect(sentBody.code).toBe('HTTP_ERROR');
    expect(sentBody.statusCode).toBe(418);
  });

  it('already-sent responses are not double-written', () => {
    const hostSent = {
      switchToHttp: () => ({
        getResponse: () => ({ headersSent: true, status: statusMock, json: jsonMock }),
        getRequest: () => ({ method: 'GET', url: '/x', requestId: 'r' }) as any,
      }),
    } as any;
    filter.catch(new Error('boom'), hostSent);
    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });
});

describe('ERROR-UX-RELIABILITY1 — request-ID middleware', () => {
  const middleware = new RequestIdMiddleware();

  it('generates a correlation ID, echoes the header and stamps the request', () => {
    const setHeader = jest.fn();
    const req: any = { headers: {} };
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toMatch(/^[\w-]{8,64}$/);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('honors a well-formed inbound x-request-id (proxy propagation)', () => {
    const req: any = { headers: { 'x-request-id': 'abc-def-12345678' } };
    const res: any = { setHeader: jest.fn() };
    middleware.use(req, res, jest.fn());
    expect(req.requestId).toBe('abc-def-12345678');
  });

  it('rejects malformed inbound IDs (injection-safe) and generates a fresh one', () => {
    const req: any = {
      headers: { 'x-request-id': 'bad id with spaces;DROP' },
    };
    const res: any = { setHeader: jest.fn() };
    middleware.use(req, res, jest.fn());
    expect(req.requestId).not.toBe('bad id with spaces;DROP');
    expect(req.requestId).toMatch(/^[\w-]{8,64}$/);
  });
});
