import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { ShopSettingsController } from './shop-settings.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/**
 * P0-4A tenant isolation shield: tenant authority must come from the JWT,
 * never from the URL :shopId segment, and mutations require admin role.
 */
describe('ShopSettingsController tenant isolation (P0-4A)', () => {
  const SHOP_A = '507f1f77bcf86cd799439011';
  const SHOP_B = '507f1f77bcf86cd799439022';
  const adminA = { sub: 'u1', shopId: SHOP_A, role: 'admin' };
  const cashierA = { sub: 'u2', shopId: SHOP_A, role: 'cashier' };
  const noTenant = { sub: 'u3', role: 'super_admin' }; // no tenant identity

  let service: any;
  let controller: ShopSettingsController;

  beforeEach(() => {
    service = {
      getByShopId: jest
        .fn()
        .mockResolvedValue({ shopId: SHOP_A, tax: { rate: 0.16 } }),
      update: jest.fn().mockResolvedValue({ shopId: SHOP_A }),
      addTaxExemptProduct: jest.fn().mockResolvedValue({}),
      removeTaxExemptProduct: jest.fn().mockResolvedValue({}),
      setCategoryTaxRate: jest.fn().mockResolvedValue({}),
      removeCategoryTaxRate: jest.fn().mockResolvedValue({}),
      getReceiptSettings: jest.fn().mockResolvedValue({}),
      updateReceiptSettings: jest.fn().mockResolvedValue({}),
      syncReceiptSettingsFromShop: jest.fn().mockResolvedValue({}),
      getBusinessTypeConfig: jest.fn().mockResolvedValue({}),
      applyBusinessTypeConfig: jest.fn().mockResolvedValue({}),
      updateBusinessTypeFeature: jest.fn().mockResolvedValue({}),
      getAvailableBusinessTypes: jest.fn().mockReturnValue([]),
      getBusinessTypesGrouped: jest.fn().mockReturnValue({}),
      getBusinessTypeProfile: jest.fn().mockReturnValue({}),
    };
    controller = new ShopSettingsController(service);
  });

  describe('reads', () => {
    it('same-tenant read is allowed and scoped to JWT shop', async () => {
      const result = await controller.getSettings(SHOP_A, adminA);
      expect(service.getByShopId).toHaveBeenCalledWith(SHOP_A);
      expect(result.shopId).toBe(SHOP_A);
    });

    it('cross-tenant read is denied and never reaches the service', async () => {
      await expect(controller.getSettings(SHOP_B, adminA)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.getByShopId).not.toHaveBeenCalled();
    });

    it('cross-tenant receipt read is denied', async () => {
      await expect(
        controller.getReceiptSettings(SHOP_B, adminA),
      ).rejects.toThrow(ForbiddenException);
      expect(service.getReceiptSettings).not.toHaveBeenCalled();
    });

    it('cross-tenant business-type-config read is denied', async () => {
      await expect(
        controller.getBusinessTypeConfig(SHOP_B, cashierA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cashier may read own-tenant settings (POS needs tax config)', async () => {
      await controller.getSettings(SHOP_A, cashierA);
      expect(service.getByShopId).toHaveBeenCalledWith(SHOP_A);
    });
  });

  describe('writes', () => {
    it('same-tenant settings update is allowed for admin', async () => {
      await controller.updateSettings(
        SHOP_A,
        { tax: { rate: 0.16 } } as any,
        adminA,
      );
      expect(service.update).toHaveBeenCalledWith(
        SHOP_A,
        expect.objectContaining({ tax: { rate: 0.16 } }),
      );
    });

    it('cross-tenant settings update is denied - SHOP_B untouched', async () => {
      await expect(
        controller.updateSettings(SHOP_B, { tax: { rate: 0 } } as any, adminA),
      ).rejects.toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('cross-tenant tax-exempt mutation is denied', async () => {
      await expect(
        controller.addTaxExemptProduct(SHOP_B, 'prod-1', adminA),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.removeTaxExemptProduct(SHOP_B, 'prod-1', adminA),
      ).rejects.toThrow(ForbiddenException);
      expect(service.addTaxExemptProduct).not.toHaveBeenCalled();
      expect(service.removeTaxExemptProduct).not.toHaveBeenCalled();
    });

    it('cross-tenant category tax-rate mutation is denied', async () => {
      await expect(
        controller.setCategoryTaxRate(
          SHOP_B,
          'cat-1',
          { rate: 0, exempt: true },
          adminA,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.removeCategoryTaxRate(SHOP_B, 'cat-1', adminA),
      ).rejects.toThrow(ForbiddenException);
      expect(service.setCategoryTaxRate).not.toHaveBeenCalled();
      expect(service.removeCategoryTaxRate).not.toHaveBeenCalled();
    });

    it('cross-tenant receipt write is denied', async () => {
      await expect(
        controller.updateReceiptSettings(
          SHOP_B,
          { footerMessage: 'x' },
          adminA,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.syncReceiptFromShop(SHOP_B, adminA),
      ).rejects.toThrow(ForbiddenException);
    });

    it('cross-tenant business-type config writes are denied', async () => {
      await expect(
        controller.applyBusinessTypeConfig(
          SHOP_B,
          { businessType: 'retail' },
          adminA,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.updateBusinessTypeFeature(
          SHOP_B,
          'barcode',
          { enabled: true },
          adminA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('business consequence proof', () => {
    it('SHOP_A admin cannot change SHOP_B tax rate - request rejected, B untouched', async () => {
      const shopBSettings = {
        shopId: SHOP_B,
        tax: { enabled: true, rate: 0.16 },
      };
      service.update.mockImplementation((shopId: string, dto: any) => {
        if (shopId === SHOP_B) Object.assign(shopBSettings, dto);
        return Promise.resolve(shopBSettings);
      });

      await expect(
        controller.updateSettings(
          SHOP_B,
          { tax: { enabled: true, rate: 0 } } as any,
          adminA,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(shopBSettings.tax.rate).toBe(0.16);
    });
  });

  describe('fail-closed tenant identity', () => {
    it('token without shopId is denied for reads and writes', async () => {
      await expect(controller.getSettings(SHOP_A, noTenant)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        controller.updateSettings(SHOP_A, {} as any, noTenant),
      ).rejects.toThrow(ForbiddenException);
      expect(service.getByShopId).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('role enforcement', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const ctx = (user: any, handler: any) =>
      ({
        getHandler: () => handler,
        getClass: () => ShopSettingsController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as any;

    const handler = (name: string): any =>
      Object.getOwnPropertyDescriptor(ShopSettingsController.prototype, name)!
        .value;

    const mutations: string[] = [
      'updateSettings',
      'addTaxExemptProduct',
      'removeTaxExemptProduct',
      'setCategoryTaxRate',
      'removeCategoryTaxRate',
      'updateReceiptSettings',
      'syncReceiptFromShop',
      'applyBusinessTypeConfig',
      'updateBusinessTypeFeature',
    ];

    it.each(mutations)('%s is decorated with admin-only roles', (name) => {
      expect(reflector.getAllAndOverride(ROLES_KEY, [handler(name)])).toEqual([
        'admin',
      ]);
    });

    it.each(mutations)('%s rejects cashier in RolesGuard', (name) => {
      expect(guard.canActivate(ctx(cashierA, handler(name)))).toBe(false);
    });

    it.each(mutations)('%s allows admin in RolesGuard', (name) => {
      expect(guard.canActivate(ctx(adminA, handler(name)))).toBe(true);
    });

    it('read endpoints carry no role restriction (any authenticated tenant user)', () => {
      for (const name of [
        'getSettings',
        'getReceiptSettings',
        'getBusinessTypeConfig',
      ]) {
        const h = handler(name);
        expect(reflector.getAllAndOverride(ROLES_KEY, [h])).toBeUndefined();
        expect(guard.canActivate(ctx(cashierA, h))).toBe(true);
      }
    });
  });
});
