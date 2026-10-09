import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { ShopsController } from '../src/shops/shops.controller';
import { ShopsService } from '../src/shops/shops.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

/**
 * P0-11B2 — SHOP ROUTE CANONICALIZATION (actual HTTP routing proofs)
 *
 * Proves over real HTTP (not prototype inspection):
 *  - removed admin routes cannot fall through into generic :id routes
 *    (GET /shops/pending and PUT /shops/:id/verify are 404);
 *  - GET /shops/my-shop is the canonical self-shop read contract;
 *  - GET /shops remains public-by-design;
 *  - no cross-tenant shop retrieval is possible.
 *
 * JwtAuthGuard is overridden by a test guard that derives the caller
 * identity from the x-test-user header so the REAL RolesGuard and the
 * REAL Nest router remain under test.
 */

const adminUser = { sub: 'u-admin', role: 'admin', shopId: 'shopA' };
const cashierUser = { sub: 'u-cash', role: 'cashier', shopId: 'shopA' };
const superAdminUser = { sub: 'u-sa', role: 'super_admin', shopId: undefined };

const asUser = (u?: Record<string, any>) =>
  u ? { 'x-test-user': JSON.stringify(u) } : {};

describe('ShopsController routing (e2e)', () => {
  let app: INestApplication<App>;
  let shopsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    shopsService = {
      findAll: jest.fn(async () => [
        { id: 'shopA', shopId: 'SHP-1', name: 'A' },
      ]),
      create: jest.fn(async (_sub: string, dto: any) => ({
        id: 'new',
        ...dto,
      })),
      findById: jest.fn(async (id: string) => ({ id, name: 'Own Shop' })),
      findByOwner: jest.fn(async () => ({ id: 'byOwner' })),
      update: jest.fn(async (id: string) => ({ id, name: 'Updated' })),
      completeOnboarding: jest.fn(async (id: string) => ({
        id,
        onboardingComplete: true,
      })),
      updateLanguage: jest.fn(async (id: string, lang: string) => ({
        id,
        language: lang,
      })),
      getStats: jest.fn(async () => ({ orders: 1 })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ShopsController],
      providers: [
        { provide: ShopsService, useValue: shopsService },
        RolesGuard,
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const raw = req.headers['x-test-user'];
          if (!raw) throw new UnauthorizedException();
          req.user = JSON.parse(raw as string);
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('removed admin routes cannot fall through into generic routes', () => {
    it.each([
      ['anonymous', undefined],
      ['cashier', cashierUser],
      ['admin', adminUser],
      ['super_admin', superAdminUser],
    ])('GET /shops/pending → 404 (%s)', async (_label, user) => {
      await request(app.getHttpServer())
        .get('/api/v1/shops/pending')
        .set(asUser(user))
        .expect(404);
      // The :id route must not have captured 'pending'
      expect(shopsService.findById).not.toHaveBeenCalledWith('pending');
    });

    it.each([
      ['admin', adminUser],
      ['super_admin', superAdminUser],
    ])('PUT /shops/:id/verify → 404 (%s)', async (_label, user) => {
      await request(app.getHttpServer())
        .put('/api/v1/shops/507f1f77bcf86cd799439011/verify')
        .set(asUser(user))
        .send({})
        .expect(404);
      expect(shopsService.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /shops/my-shop is the canonical self-shop read', () => {
    it('anonymous → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/shops/my-shop')
        .expect(401);
      expect(shopsService.findById).not.toHaveBeenCalled();
    });

    it.each([
      ['cashier', cashierUser],
      ['admin', adminUser],
    ])(
      '%s with shop → own shop only (tenant bound to JWT shopId)',
      async (_l, user) => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/shops/my-shop')
          .set(asUser(user))
          .expect(200);
        expect(shopsService.findById).toHaveBeenCalledWith('shopA');
        expect(res.body.id).toBe('shopA');
      },
    );
  });

  describe('no cross-tenant shop retrieval', () => {
    it('GET /shops/:id does not exist — arbitrary ids are 404 even for admins', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/shops/someOtherShopId')
        .set(asUser(adminUser))
        .expect(404);
      expect(shopsService.findById).not.toHaveBeenCalledWith('someOtherShopId');
    });

    it('GET /shops/:id/stats rejects a foreign shop id (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/shops/shopB/stats')
        .set(asUser(adminUser))
        .expect(403);
      expect(shopsService.getStats).not.toHaveBeenCalled();
    });
  });

  describe('public discovery preserved', () => {
    it('GET /shops stays public and returns the minimal projection', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/shops')
        .expect(200);
      expect(shopsService.findAll).toHaveBeenCalled();
      expect(res.body).toEqual([{ id: 'shopA', shopId: 'SHP-1', name: 'A' }]);
    });
  });

  describe('mutation role matrix over HTTP', () => {
    it('cashier → PUT /shops/my-shop is 403; admin → 200 on JWT shop only', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/shops/my-shop')
        .set(asUser(cashierUser))
        .send({ name: 'X' })
        .expect(403);

      await request(app.getHttpServer())
        .put('/api/v1/shops/my-shop')
        .set(asUser(adminUser))
        .send({ name: 'X' })
        .expect(200);
      expect(shopsService.update).toHaveBeenCalledWith('shopA', { name: 'X' });
    });

    it('cashier → complete-onboarding 403; admin → JWT shop regardless of route id', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shops/shopB/complete-onboarding')
        .set(asUser(cashierUser))
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/shops/shopB/complete-onboarding')
        .set(asUser(adminUser))
        .expect(201);
      expect(shopsService.completeOnboarding).toHaveBeenCalledWith('shopA');
    });
  });
});
