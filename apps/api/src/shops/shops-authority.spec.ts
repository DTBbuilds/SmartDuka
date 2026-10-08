/* eslint-disable @typescript-eslint/unbound-method */
// Route-handler method references below are passed to Reflector.get() to read
// @Roles metadata (never invoked detached), which the unbound-method rule
// cannot distinguish from accidental method detaching.
import {
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ShopsController, UpdateShopLanguageDto } from './shops.controller';
import { ShopsService } from './shops.service';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import {
  RegisterShopDto,
  RegisterShopGoogleDto,
  ShopInfoDto,
} from '../auth/dto/register-shop.dto';
import { SUPPORTED_CURRENCIES } from '../common/currency';

/**
 * P0-11B — SHOP REGISTRATION + MUTATION AUTHORITY
 *
 * Proves:
 *  - the global ValidationPipe contract (whitelist + forbidNonWhitelisted)
 *    actually receives class metatypes on every shop mutation surface, so
 *    privileged fields (status, verification*, ownerId, counters) and unknown
 *    properties are rejected at the controller boundary;
 *  - ShopsService persists an explicit allowlist — even a bypassed DTO can
 *    never carry privileged/unknown fields into MongoDB;
 *  - role authority: verification/pending/creation are super_admin-only,
 *    ordinary shop updates are admin-only, and the route id is never trusted
 *    (tenant isolation by construction);
 *  - the public login-discovery projection stays minimal;
 *  - registration (email + Google) validates country/currency and can never
 *    self-activate a shop.
 */

const pipe = () =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });

const PRIVILEGED_FIELDS = {
  status: 'active',
  verificationNotes: 'self-verified',
  verificationDate: new Date().toISOString(),
  ownerId: '507f1f77bcf86cd7994390aa',
  shopId: 'SHP-99999-ZZZZZ',
  cashierCount: 99,
  totalSales: 999999,
  totalOrders: 999999,
  onboardingComplete: true,
  settings: { hijacked: true },
  arbitraryUnknownField: 'injected',
};

describe('P0-11B shop authority', () => {
  describe('DTO enforcement through the global ValidationPipe contract', () => {
    it('ordinary settings payload (real Settings page shape) passes UpdateShopDto', async () => {
      const value = await pipe().transform(
        {
          name: 'Duka',
          tillNumber: '123456',
          address: 'Westlands',
          phone: '0712345678',
          email: 'admin@duka.co.ke',
          taxRate: 16,
          currency: 'KES',
        },
        { type: 'body', metatype: UpdateShopDto },
      );
      expect(value.name).toBe('Duka');
      expect(value.taxRate).toBe(16); // accepted for wire compat, never persisted
    });

    it('privileged and unknown fields are rejected on the ordinary update DTO', async () => {
      for (const [field, val] of Object.entries(PRIVILEGED_FIELDS)) {
        await expect(
          pipe().transform(
            { name: 'Duka', [field]: val },
            { type: 'body', metatype: UpdateShopDto },
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });

    it('invalid country/currency rejected; P0-11A ISK accepted', async () => {
      await expect(
        pipe().transform(
          { country: 'XX' },
          { type: 'body', metatype: UpdateShopDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe().transform(
          { currency: 'FAKE' },
          { type: 'body', metatype: UpdateShopDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      const ok = await pipe().transform(
        { currency: 'ISK', country: 'IS' },
        { type: 'body', metatype: UpdateShopDto },
      );
      expect(ok.currency).toBe('ISK');
    });

    it('invalid KRA PIN format rejected', async () => {
      await expect(
        pipe().transform(
          { kraPin: '1234' },
          { type: 'body', metatype: UpdateShopDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('CreateShopDto rejects privileged/unknown fields', async () => {
      await expect(
        pipe().transform(
          {
            name: 'Duka',
            email: 'a@b.co',
            phone: '0712345678',
            businessType: 'retail',
            status: 'active',
          },
          { type: 'body', metatype: CreateShopDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('email registration rejects invalid country/currency/unknown fields; ISK valid', async () => {
      const base = {
        shop: {
          shopName: 'Duka',
          businessType: 'retail',
          country: 'KE',
          county: 'Nairobi',
          city: 'Nairobi',
          currency: 'KES',
        },
        admin: {
          name: 'Ada',
          email: 'ada@duka.co.ke',
          phone: '0712345678',
          password: 'secret123',
        },
      };
      await expect(
        pipe().transform(
          { ...base, shop: { ...base.shop, country: 'XX' } },
          { type: 'body', metatype: RegisterShopDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe().transform(
          { ...base, shop: { ...base.shop, currency: 'FAKE' } },
          { type: 'body', metatype: RegisterShopDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe().transform(
          { ...base, shop: { ...base.shop, status: 'active' } },
          { type: 'body', metatype: RegisterShopDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      const ok = await pipe().transform(
        { ...base, shop: { ...base.shop, currency: 'ISK', country: 'IS' } },
        { type: 'body', metatype: RegisterShopDto },
      );
      expect(ok.shop.currency).toBe('ISK');
    });

    it('Google registration DTO validates like the email path and rejects privileged fields', async () => {
      const base = {
        googleProfile: {
          googleId: 'gid-1',
          email: 'g@duka.co.ke',
          name: 'Gus',
        },
        shop: {
          shopName: 'Duka',
          businessType: 'retail',
          country: 'KE',
          county: 'Nairobi',
          city: 'Nairobi',
          currency: 'KES',
        },
      };
      const ok = await pipe().transform(base, {
        type: 'body',
        metatype: RegisterShopGoogleDto,
      });
      expect(ok.shop.shopName).toBe('Duka');
      expect(ok.googleProfile.email).toBe('g@duka.co.ke');

      await expect(
        pipe().transform(
          { ...base, shop: { ...base.shop, country: 'XX' } },
          { type: 'body', metatype: RegisterShopGoogleDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe().transform(
          { ...base, shop: { ...base.shop, currency: 'FAKE' } },
          { type: 'body', metatype: RegisterShopGoogleDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe().transform(
          { ...base, shop: { ...base.shop, status: 'active' } },
          { type: 'body', metatype: RegisterShopGoogleDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        pipe().transform(
          { ...base, googleProfile: { ...base.googleProfile, extra: 'x' } },
          { type: 'body', metatype: RegisterShopGoogleDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('P0-11A 51-currency catalogue intact and ISK present', () => {
      expect(SUPPORTED_CURRENCIES).toContain('ISK');
      expect(SUPPORTED_CURRENCIES).toContain('KES');
      expect(SUPPORTED_CURRENCIES.length).toBe(51);
    });
  });

  describe('service persistence allowlist (defense-in-depth)', () => {
    let captured: any;
    let service: ShopsService;

    beforeEach(() => {
      captured = null;
      const model: any = jest.fn().mockImplementation((data: any) => {
        return { data, save: jest.fn(async () => data) };
      });
      model.countDocuments = jest.fn(async () => 0);
      model.findOne = jest.fn(async () => null);
      model.findById = jest.fn(async () => null);
      model.findByIdAndUpdate = jest.fn((_id: any, update: any) => {
        const run = async () => {
          captured = update;
          return { _id, ...update };
        };
        return {
          exec: run,
          then: (res: any, rej: any) => run().then(res, rej),
        };
      });
      service = new ShopsService(model);
    });

    it('update() persists ONLY allowlisted mutable fields — privileged/unknown never reach MongoDB', async () => {
      await service.update('507f1f77bcf86cd799439011', {
        name: 'Duka',
        city: 'Nairobi',
        currency: 'KES',
        ...(PRIVILEGED_FIELDS as any),
        totallyUnknown: 'x',
      });

      expect(captured).toBeDefined();
      expect(captured.name).toBe('Duka');
      expect(captured.city).toBe('Nairobi');
      expect(captured.currency).toBe('KES');
      for (const field of Object.keys(PRIVILEGED_FIELDS)) {
        expect(captured[field]).toBeUndefined();
      }
      expect(captured.totallyUnknown).toBeUndefined();
      expect(captured.updatedAt).toBeInstanceOf(Date);
    });

    it('update() preserves kraPin normalize + unset semantics', async () => {
      await service.update('507f1f77bcf86cd799439011', {
        kraPin: ' a123456789b ',
      });
      expect(captured.kraPin).toBe('A123456789B');

      await service.update('507f1f77bcf86cd799439011', { kraPin: '' });
      expect(captured.$unset).toEqual({ kraPin: 1 });
    });

    it('create() is server-owned: status always pending, counters zeroed, injection dropped', async () => {
      const model: any = jest.fn().mockImplementation((data: any) => {
        return { data, save: jest.fn(async () => data) };
      });
      model.countDocuments = jest.fn(async () => 0);
      model.findOne = jest.fn(async () => null);
      const svc = new ShopsService(model);

      const shop = await svc.create('507f1f77bcf86cd7994390aa', {
        name: 'Duka',
        email: 'a@b.co',
        phone: '0712345678',
        businessType: 'retail',
        country: 'KE',
        county: 'Nairobi',
        city: 'Nairobi',
        currency: 'KES',
        status: 'active',
        totalSales: 1,
        ownerId: 'hacked',
        onboardingComplete: true,
      } as any);

      expect(shop.status).toBe('pending');
      expect(shop.onboardingComplete).toBe(false);
      expect(shop.totalSales).toBe(0);
      expect(shop.cashierCount).toBe(0);
      expect(shop.ownerId).toBeInstanceOf(Object); // server-derived ObjectId
      expect(shop.language).toBe('en');
    });
  });

  describe('role + tenant authority', () => {
    let controller: ShopsController;
    let service: jest.Mocked<ShopsService>;
    const reflector = new Reflector();

    beforeEach(() => {
      service = {
        findAll: jest.fn(async () => []),
        create: jest.fn(),
        findById: jest.fn(),
        findByOwner: jest.fn(),
        update: jest.fn(async () => ({ name: 'Duka', shopId: 'SHP-1' })),
        completeOnboarding: jest.fn(),
        updateLanguage: jest.fn(),
        getStats: jest.fn(),
      } as any;
      controller = new ShopsController(service, undefined);
    });

    const rolesOf = (handler: () => any): string[] | undefined =>
      reflector.get(ROLES_KEY, handler as () => any);

    it('shop creation requires super_admin; no legacy verify/pending handlers exist', () => {
      expect(rolesOf(controller.create)).toEqual(['super_admin']);
      // P0-11B1: the duplicate cross-shop surfaces were REMOVED — the
      // controller prototype must not expose them at all.
      const proto = Object.getOwnPropertyNames(ShopsController.prototype);
      expect(proto).not.toContain('verifyShop');
      expect(proto).not.toContain('getPendingShops');
    });

    it('complete-onboarding and language are SHOP-WIDE mutations — admin only', () => {
      expect(rolesOf(controller.completeOnboarding)).toEqual(['admin']);
      expect(rolesOf(controller.updateLanguage)).toEqual(['admin']);
    });

    it('ordinary shop updates require admin (never cashier)', () => {
      expect(rolesOf(controller.updateMyShop)).toEqual(['admin']);
      expect(rolesOf(controller.updateShop)).toEqual(['admin']);
    });

    it('RolesGuard: cashier cannot satisfy admin/super_admin routes; super_admin can', () => {
      const guard = new RolesGuard(reflector);
      const ctx = (role: string | undefined, handler: () => any) =>
        ({
          switchToHttp: () => ({
            getRequest: () => ({ user: role ? { role } : undefined }),
          }),
          getHandler: () => handler,
          getClass: () => ShopsController,
        }) as any;

      expect(guard.canActivate(ctx('cashier', controller.updateShop))).toBe(
        false,
      );
      expect(guard.canActivate(ctx('admin', controller.updateShop))).toBe(true);
      expect(
        guard.canActivate(ctx('cashier', controller.completeOnboarding)),
      ).toBe(false);
      expect(
        guard.canActivate(ctx('admin', controller.completeOnboarding)),
      ).toBe(true);
      expect(guard.canActivate(ctx('cashier', controller.updateLanguage))).toBe(
        false,
      );
      expect(guard.canActivate(ctx('admin', controller.updateLanguage))).toBe(
        true,
      );
      expect(guard.canActivate(ctx(undefined, controller.create))).toBe(false);
    });

    it('cashier shop mutation through PUT /shops/:id is blocked (403 via guard chain)', () => {
      // The route carries @Roles('admin'); a cashier JWT fails RolesGuard
      // before the handler — the handler itself is tenant-bound to
      // user.shopId (route id never trusted).
      const guard = new RolesGuard(reflector);
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'cashier', shopId: 'shopA' } }),
        }),
        getHandler: () => controller.updateShop,
        getClass: () => ShopsController,
      } as any;
      expect(guard.canActivate(ctx)).toBe(false);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('admin update targets ONLY the caller shop — route id never trusted (cross-tenant safe)', async () => {
      await controller.updateShop({ name: 'X' }, { shopId: 'shopA' } as any);
      expect(service.update).toHaveBeenCalledWith('shopA', { name: 'X' });
      // Even when a foreign id is in the URL, service receives user.shopId.
    });

    it('stats for a foreign shop id are rejected (no cross-tenant leak)', async () => {
      await expect(
        controller.getStats('shopB', { shopId: 'shopA' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('complete-onboarding and language target ONLY the JWT shop (route id never trusted)', async () => {
      await controller.completeOnboarding({ shopId: 'shopA' } as any);
      expect(service.completeOnboarding).toHaveBeenCalledWith('shopA');
      await controller.updateLanguage({ language: 'sw' }, {
        shopId: 'shopA',
      } as any);
      expect(service.updateLanguage).toHaveBeenCalledWith('shopA', 'sw');
    });

    it('language update uses a validated DTO class', async () => {
      const value = await pipe().transform(
        { language: 'sw' },
        { type: 'body', metatype: UpdateShopLanguageDto },
      );
      expect(value.language).toBe('sw');
      await expect(
        pipe().transform(
          { language: 'fr' },
          { type: 'body', metatype: UpdateShopLanguageDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('P0-11B1 canonical super-admin verification regression', () => {
    it('canonical verifyShop: pending→active transition, verificationBy/Date, audit event', async () => {
      const shopId = '507f1f77bcf86cd799439011';
      const superAdminId = '507f1f77bcf86cd799439022';
      const auditCreate = jest.fn(async () => ({}));
      const capturedUpdate: any = {};
      const shopModel: any = {
        findById: jest.fn(() => ({
          exec: async () => ({
            _id: shopId,
            status: 'pending',
            email: 'a@x.co',
          }),
        })),
        findByIdAndUpdate: jest.fn((_id: any, update: any) => {
          Object.assign(capturedUpdate, update);
          return {
            exec: async () => ({ _id: shopId, ...update, email: 'a@x.co' }),
          };
        }),
      };
      const svc = new SuperAdminService(
        shopModel,
        {} as any, // userModel
        { findOne: jest.fn(() => ({ exec: async () => null })) } as any, // subscriptionModel
        {} as any, // planModel
        {} as any, // connection
        { create: auditCreate } as any, // auditLogService
        undefined, // emailService (optional)
        undefined, // cacheService (optional)
      );

      const result = await svc.verifyShop(shopId, superAdminId, 'looks good');

      expect(result.status).toBe('active');
      expect(capturedUpdate.status).toBe('active');
      expect(capturedUpdate.verificationBy).toBeInstanceOf(Object);
      expect(capturedUpdate.verificationDate).toBeInstanceOf(Date);
      expect(auditCreate).toHaveBeenCalledTimes(1);
      expect(auditCreate.mock.calls[0][0]).toMatchObject({
        shopId,
        performedBy: superAdminId,
        action: 'verify',
        oldValue: { status: 'pending' },
        newValue: { status: 'active' },
        notes: 'looks good',
      });
    });

    it('canonical verifyShop rejects non-pending shops (state-transition validation)', async () => {
      const shopId = '507f1f77bcf86cd799439011';
      const svc = new SuperAdminService(
        {
          findById: jest.fn(() => ({
            exec: async () => ({ _id: shopId, status: 'suspended' }),
          })),
        } as any,
        {} as any,
        { findOne: jest.fn(() => ({ exec: async () => null })) } as any,
        {} as any,
        {} as any,
        { create: jest.fn() } as any,
        undefined,
        undefined,
      );
      await expect(
        svc.verifyShop(shopId, '507f1f77bcf86cd799439022', undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('public login-discovery projection stays minimal', () => {
    it('findAll exposes only id/shopId/name/status (+ demo fields for pending)', async () => {
      const now = new Date();
      const model: any = {
        find: jest.fn(() => ({
          select: jest.fn(() => ({
            exec: jest.fn(async () => [
              {
                _id: 'id1',
                shopId: 'SHP-1',
                name: 'Active Shop',
                status: 'active',
                email: 'secret@x.co',
                phone: '0700000000',
                kraPin: 'A123456789B',
                ownerId: 'owner1',
                totalSales: 999,
                settings: { a: 1 },
                verificationNotes: 'internal',
                createdAt: now,
              },
              {
                _id: 'id2',
                shopId: 'SHP-2',
                name: 'Pending Shop',
                status: 'pending',
                email: 'p@x.co',
                createdAt: now,
              },
            ]),
          })),
        })),
      };
      const service = new ShopsService(model);
      const shops = await service.findAll();
      expect(shops).toHaveLength(2);
      for (const s of shops) {
        expect(Object.keys(s).sort()).toEqual(
          expect.arrayContaining(['id', 'shopId', 'name', 'status']),
        );
        expect(Object.keys(s)).not.toContain('email');
        expect(Object.keys(s)).not.toContain('phone');
        expect(Object.keys(s)).not.toContain('kraPin');
        expect(Object.keys(s)).not.toContain('ownerId');
        expect(Object.keys(s)).not.toContain('totalSales');
        expect(Object.keys(s)).not.toContain('settings');
        expect(Object.keys(s)).not.toContain('verificationNotes');
      }
      const pending = shops.find((s: any) => s.status === 'pending');
      expect(pending.demoMode).toBe(true);
      expect(pending.demoExpiresAt).toBeInstanceOf(Date);
    });
  });

  describe('registration status authority', () => {
    it('ShopInfoDto cannot carry a status field at all', async () => {
      await expect(
        pipe().transform(
          { status: 'active' },
          { type: 'body', metatype: ShopInfoDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
