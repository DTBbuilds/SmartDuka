import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { RequestIdMiddleware } from '../middleware/request-id.middleware';
import { HttpException, HttpStatus as Status } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * ERROR-UX-RELIABILITY1 (PR E) — fault-injected canonical error contract.
 *
 * Real HTTP (supertest) against the REAL AllExceptionsFilter +
 * RequestIdMiddleware, with a controller that injects every fault class the
 * application can produce: validation, auth, permission, not-found,
 * conflict, rate-limit, unhandled Error, non-Error throw, and a duplicate
 * submission guarded by an idempotency key (no double-credit).
 */

const faults: Record<string, () => never> = {
  'bad-request': () => {
    throw new BadRequestException('Invalid request payload');
  },
  unauthorized: () => {
    throw new UnauthorizedException('Session expired');
  },
  forbidden: () => {
    throw new ForbiddenException('You do not have permission');
  },
  'not-found': () => {
    throw new NotFoundException('Order not found');
  },
  conflict: () => {
    throw new ConflictException('Branch code already exists in this shop');
  },
  'rate-limited': () => {
    throw new HttpException('Too many requests', Status.TOO_MANY_REQUESTS);
  },
  'unhandled-error': () => {
    throw new Error(
      'E11000 duplicate key error collection: smartduka.users index: email_1 dup key: { email: "x@y.z" }',
    );
  },
  'non-error-throw': () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw { suspicious: 'payload' };
  },
};

@Controller('fault')
class FaultController {
  @Get(':kind')
  @HttpCode(HttpStatus.OK)
  fault(@Param('kind') kind: string) {
    const fault = faults[kind];
    if (!fault) throw new NotFoundException('Unknown fault');
    fault();
  }

  private submissions = new Map<string, { id: string; amount: number }>();

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() body: { idempotencyKey: string; amount: number }) {
    // Server-side idempotency-key semantics: the same key returns the SAME
    // result — a duplicated submission must not create a second record.
    const existing = this.submissions.get(body.idempotencyKey);
    if (existing) return { duplicated: true, ...existing };
    const record = { id: `R${this.submissions.size + 1}`, amount: body.amount };
    this.submissions.set(body.idempotencyKey, record);
    return { duplicated: false, ...record };
  }
}

describe('ERROR-UX-RELIABILITY1 — fault-injected canonical error contract (real HTTP)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [FaultController],
    }).compile();

    app = moduleRef.createNestApplication();
    const requestIdMiddleware = new RequestIdMiddleware();
    app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const statusByFault: Record<string, number> = {
    'bad-request': 400,
    unauthorized: 401,
    forbidden: 403,
    'not-found': 404,
    conflict: 409,
    'rate-limited': 429,
    'unhandled-error': 500,
    'non-error-throw': 500,
  };

  const codeByFault: Record<string, string> = {
    'bad-request': 'VALIDATION_ERROR',
    unauthorized: 'UNAUTHENTICATED',
    forbidden: 'FORBIDDEN',
    'not-found': 'NOT_FOUND',
    conflict: 'CONFLICT',
    'rate-limited': 'RATE_LIMITED',
    'unhandled-error': 'INTERNAL_ERROR',
    'non-error-throw': 'INTERNAL_ERROR',
  };

  for (const kind of Object.keys(faults)) {
    it(`${kind} → ${statusByFault[kind]} with canonical shape, stable code and correlation ID`, async () => {
      const res = await request(app.getHttpServer())
        .get(`/fault/${kind}`)
        .expect(statusByFault[kind]);

      expect(res.body).toMatchObject({
        statusCode: statusByFault[kind],
        code: codeByFault[kind],
        path: `/fault/${kind}`,
        method: 'GET',
      });
      expect(typeof res.body.timestamp).toBe('string');
      expect(res.body.requestId).toMatch(/^[\w-]{8,64}$/);
      expect(res.headers['x-request-id']).toBe(res.body.requestId);
    });
  }

  it('unhandled Error NEVER discloses the raw internal message', async () => {
    const res = await request(app.getHttpServer())
      .get('/fault/unhandled-error')
      .expect(500);

    expect(res.body.message).toBe('Internal server error. Please try again.');
    expect(JSON.stringify(res.body)).not.toMatch(
      /E11000|duplicate key|smartduka\.users/i,
    );
  });

  it('non-Error throws are sanitized the same way', async () => {
    const res = await request(app.getHttpServer())
      .get('/fault/non-error-throw')
      .expect(500);

    expect(res.body.message).toBe('Internal server error. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('suspicious');
  });

  it('429 responses carry retryable metadata; 4xx business errors do not', async () => {
    const limited = await request(app.getHttpServer()).get(
      '/fault/rate-limited',
    );
    expect(limited.body.retryable).toBe(true);

    const conflict = await request(app.getHttpServer()).get('/fault/conflict');
    expect(conflict.body.retryable).toBeUndefined();
    expect(conflict.body.message).toBe(
      'Branch code already exists in this shop',
    );
  });

  it('duplicate submission with the same idempotency key never creates a second record', async () => {
    const key = `idem-${Date.now()}`;

    const first = await request(app.getHttpServer())
      .post('/fault/submit')
      .send({ idempotencyKey: key, amount: 1000 })
      .expect(201);
    expect(first.body.duplicated).toBe(false);
    expect(first.body.id).toBe('R1');

    // The client retried / double-clicked: same key → same record.
    for (let i = 0; i < 3; i++) {
      const replay = await request(app.getHttpServer())
        .post('/fault/submit')
        .send({ idempotencyKey: key, amount: 1000 })
        .expect(201);
      expect(replay.body.duplicated).toBe(true);
      expect(replay.body.id).toBe('R1'); // no second record, no double-credit
    }
  });

  it('distinct idempotency keys create distinct records', async () => {
    const a = await request(app.getHttpServer())
      .post('/fault/submit')
      .send({ idempotencyKey: `a-${Date.now()}`, amount: 5 })
      .expect(201);
    const b = await request(app.getHttpServer())
      .post('/fault/submit')
      .send({ idempotencyKey: `b-${Date.now()}`, amount: 5 })
      .expect(201);
    expect(a.body.id).not.toBe(b.body.id);
  });
});
