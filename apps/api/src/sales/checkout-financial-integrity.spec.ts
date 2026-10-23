import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { Order } from './schemas/order.schema';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { PaymentTransactionService } from '../payments/services/payment-transaction.service';
import { CacheService } from '../common/services/cache.service';
import { ShopSettingsService } from '../shop-settings/shop-settings.service';
import { TransactionService } from '../common/services/transaction.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';
import { ShiftsService } from '../shifts/shifts.service';

jest.mock('nanoid', () => ({
  nanoid: () => 'JD2PTR',
}));

/**
 * SMARTDUKA QUALITY-CORE1 — P0 FINANCIAL INTEGRITY REGRESSION SHIELD
 *
 * Production incident (23 Oct 2026, orders STK-2026-JD2PTR / STK-2026-ERIQ05):
 *   Orders page total ......... KES 933.80
 *   Payments page recorded .... KES 805.00 (Completed)
 *   Order payment badge ....... Partial
 *   Difference ................ KES 128.80 = exactly 16% of 805.00 (VAT)
 *
 * Root cause proven by these fixtures:
 *   The POS client computed the payable amount from its own (possibly absent)
 *   tax settings and sent it as the payment allocation. The server recomputed
 *   the total independently (shop settings: VAT 16% additive) and persisted the
 *   client amount as the tender without reconciling it against the
 *   server-authoritative total. The customer was charged the pre-tax amount
 *   while the order carried the tax-inclusive total — a silent, permanent
 *   phantom receivable born 'completed'.
 *
 * Contract under test (the fix):
 *   R1  External (mpesa/stripe) allocation amounts are SERVER-DERIVED from the
 *       payable balance; client-sent external amounts are tamper hints only.
 *   R2  A checkout whose confirmed non-external tender does not cover the
 *       payable total and carries no external allocation to cover the
 *       remainder is REJECTED — no silent phantom receivable.
 *   R3  Tax is computed server-side per rate group (exempt products, category
 *       overrides, zero-rated, inclusive pricing) with 2-decimal rounding.
 */
describe('QUALITY-CORE1 checkout financial integrity', () => {
  let service: SalesService;
  let orderCtorArgs: any[];
  let paymentTxnArgs: any[];
  let inventoryService: any;
  let shopSettingsService: any;
  let loyaltyService: any;

  const SHOP = '507f1f77bcf86cd799439011';
  const USER_A = '507f1f77bcf86cd799439012';
  const PRODUCT = '507f1f77bcf86cd799439031';
  const PRODUCT_B = '507f1f77bcf86cd799439032';
  const CATEGORY = '507f1f77bcf86cd799439081';

  // The exact incident numbers.
  const INCIDENT_SUBTOTAL = 805; // KES 805.00 shelf subtotal
  const INCIDENT_TAX = 128.8; // 16% VAT
  const INCIDENT_TOTAL = 933.8; // KES 933.80

  async function boot(
    overrides: {
      products?: Record<string, any>;
      settings?: any;
      loyaltyRedeem?: jest.Mock;
      findOneResult?: any;
    } = {},
  ) {
    orderCtorArgs = [];
    paymentTxnArgs = [];

    const products = overrides.products ?? {
      [PRODUCT]: {
        _id: PRODUCT,
        shopId: SHOP,
        name: 'Incident Basket Item',
        price: INCIDENT_SUBTOTAL,
        cost: 500,
        stock: 10,
      },
    };

    const mockOrderModel: any = jest.fn().mockImplementation((arg: any) => {
      orderCtorArgs.push(arg);
      const doc = {
        _id: '507f1f77bcf86cd799439060',
        ...arg,
        save: jest.fn().mockImplementation(async () => {
          Object.assign(doc, arg);
          return doc;
        }),
      };
      return doc;
    });
    mockOrderModel.find = jest.fn().mockReturnThis();
    mockOrderModel.findOne = jest
      .fn()
      .mockImplementation(async (query: any) =>
        query?.idempotencyKey ? (overrides.findOneResult ?? null) : null,
      );
    mockOrderModel.countDocuments = jest.fn().mockResolvedValue(0);
    mockOrderModel.sort = jest.fn().mockReturnThis();
    mockOrderModel.skip = jest.fn().mockReturnThis();
    mockOrderModel.limit = jest.fn().mockReturnThis();
    mockOrderModel.exec = jest
      .fn()
      .mockResolvedValue(overrides.findOneResult ?? []);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn() },
        },
        {
          provide: InventoryService,
          useValue: {
            getProductById: jest
              .fn()
              .mockImplementation(async (_shopId: string, pid: string) =>
                products[pid] ? { ...products[pid] } : null,
              ),
            updateStock: jest.fn().mockResolvedValue({ stock: 9 }),
            createStockAdjustment: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ActivityService,
          useValue: { logActivity: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: PaymentTransactionService,
          useValue: {
            createTransaction: jest.fn().mockImplementation(async (dto: any) => {
              paymentTxnArgs.push(dto);
              return {};
            }),
          },
        },
        {
          provide: CacheService,
          useValue: { deletePattern: jest.fn(), getOrSet: jest.fn() },
        },
        {
          provide: ShopSettingsService,
          useValue: {
            getByShopId: jest
              .fn()
              .mockResolvedValue(
                overrides.settings ?? { tax: { enabled: true, rate: 0.16 } },
              ),
          },
        },
        {
          provide: TransactionService,
          useValue: {
            withTransaction: jest
              .fn()
              .mockImplementation((fn: any) => fn(null)),
            checkTransactionSupport: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            redeemPoints:
              overrides.loyaltyRedeem ?? jest.fn().mockResolvedValue({}),
            earnPoints: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CustomersService,
          useValue: {
            findByIdForShop: jest
              .fn()
              .mockImplementation(async (_shopId: string, id: string) =>
                id === '507f1f77bcf86cd799439071' ? { _id: id, shopId: SHOP } : null,
              ),
            updatePurchaseStats: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ShiftsService,
          useValue: { getShiftById: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    inventoryService = module.get(InventoryService);
    shopSettingsService = module.get(ShopSettingsService);
    loyaltyService = module.get(LoyaltyService);
    return service;
  }

  const incidentItems = (unitPrice = INCIDENT_SUBTOTAL) => [
    {
      productId: PRODUCT,
      name: 'Incident Basket Item',
      quantity: 1,
      unitPrice,
    },
  ];

  describe('R2 — no silent phantom receivable (incident reproduction)', () => {
    it('STK-2026-JD2PTR fixture: send_money 805.00 tender against a 933.80 taxable basket is rejected, not born completed+partial', async () => {
      await boot();
      // The client computed 805.00 because its tax settings had not loaded
      // (tax=0 client-side). The server applies VAT 16% → 933.80.
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: incidentItems(),
          payments: [{ method: 'send_money', amount: 805 }],
        }),
      ).rejects.toThrow(BadRequestException);
      // No order was persisted — no phantom receivable, no stock leakage.
      expect(orderCtorArgs.length).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('cash under-tender is rejected with the outstanding amount named', async () => {
      await boot();
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: incidentItems(),
          payments: [{ method: 'cash', amount: 500 }],
        }),
      ).rejects.toThrow(/805\.00|933\.80|outstanding|shortfall|balance/i);
    });

    it('over-tender without change mechanics is rejected', async () => {
      await boot();
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: incidentItems(),
          payments: [{ method: 'cash', amount: 1000 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('exact tender completes paid (the healthy path)', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [{ method: 'send_money', amount: INCIDENT_TOTAL }],
      });
      expect(order.total).toBe(INCIDENT_TOTAL);
      expect(order.tax).toBe(INCIDENT_TAX);
      expect(order.paymentStatus).toBe('paid');
      expect(order.status).toBe('completed');
    });
  });

  describe('R1 — external allocation amounts are server-derived', () => {
    it('STK push charges the server total (933.80) even when the client hints 805', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [{ method: 'mpesa', amount: 805, status: 'pending' }],
      });
      const mpesa = order.payments.find((p: any) => p.method === 'mpesa');
      expect(order.total).toBe(INCIDENT_TOTAL);
      expect(mpesa.amount).toBe(INCIDENT_TOTAL); // server-derived, NOT 805
      expect(order.status).toBe('pending');
      expect(order.paymentStatus).toBe('unpaid');
    });

    it('split cash + mpesa: mpesa allocation becomes the remaining balance', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [
          { method: 'cash', amount: 500 },
          { method: 'mpesa', amount: 100, status: 'pending' },
        ],
      });
      const mpesa = order.payments.find((p: any) => p.method === 'mpesa');
      expect(mpesa.amount).toBe(433.8); // 933.80 - 500.00
      expect(order.paymentStatus).toBe('partial');
      expect(order.status).toBe('pending');
    });

    it('loyalty redemption failure: client-subtracted discount is ignored, external charge covers the full total', async () => {
      await boot({
        loyaltyRedeem: jest.fn().mockRejectedValue(new Error('insufficient points')),
      });
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        customerId: '507f1f77bcf86cd799439071',
        loyaltyPointsToRedeem: 128.8,
        payments: [{ method: 'mpesa', amount: 805, status: 'pending' }],
      });
      const mpesa = order.payments.find((p: any) => p.method === 'mpesa');
      expect(order.loyaltyDiscount).toBe(0);
      expect(order.total).toBe(INCIDENT_TOTAL);
      expect(mpesa.amount).toBe(INCIDENT_TOTAL);
    });

    it('loyalty redemption success: external charge covers the discounted total', async () => {
      await boot({
        loyaltyRedeem: jest.fn().mockResolvedValue({ pointsRedeemed: 128.8 }),
      });
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        customerId: '507f1f77bcf86cd799439071',
        loyaltyPointsToRedeem: 128.8,
        payments: [{ method: 'mpesa', amount: 805, status: 'pending' }],
      });
      const mpesa = order.payments.find((p: any) => p.method === 'mpesa');
      expect(order.loyaltyDiscount).toBe(128.8);
      expect(order.total).toBe(805);
      expect(mpesa.amount).toBe(805);
    });

    it('multiple external allocations must sum to the remaining balance', async () => {
      await boot();
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: incidentItems(),
          payments: [
            { method: 'mpesa', amount: 400, status: 'pending' },
            { method: 'stripe', amount: 400, status: 'pending' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [
          { method: 'mpesa', amount: 400, status: 'pending' },
          { method: 'stripe', amount: 533.8, status: 'pending' },
        ],
      });
      expect(order.total).toBe(INCIDENT_TOTAL);
    });

    it('external allocation covering an already-fully-tendered order is dropped', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [
          { method: 'cash', amount: INCIDENT_TOTAL },
          { method: 'mpesa', amount: 50, status: 'pending' },
        ],
      });
      expect(order.payments.find((p: any) => p.method === 'mpesa')).toBeUndefined();
      expect(order.paymentStatus).toBe('paid');
      expect(order.status).toBe('completed');
    });
  });

  describe('R3 — tax computation authority', () => {
    it('rounds tax to 2 decimals (128.80, not Math.round 129)', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [{ method: 'cash', amount: INCIDENT_TOTAL }],
      });
      expect(order.tax).toBe(128.8);
      expect(order.total).toBe(933.8);
    });

    it('tax-exempt products are not taxed; mixed basket taxes only taxable lines', async () => {
      await boot({
        products: {
          [PRODUCT]: {
            _id: PRODUCT,
            shopId: SHOP,
            name: 'Exempt Medicine',
            price: 500,
            cost: 300,
            stock: 10,
          },
          [PRODUCT_B]: {
            _id: PRODUCT_B,
            shopId: SHOP,
            name: 'Taxable Soda',
            price: 305,
            cost: 200,
            stock: 10,
          },
        },
        settings: {
          tax: { enabled: true, rate: 0.16, appliedByDefault: true },
          taxExemptProducts: [PRODUCT],
          categoryTaxRates: {},
        },
      });
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [
          { productId: PRODUCT, name: 'Exempt Medicine', quantity: 1, unitPrice: 500 },
          { productId: PRODUCT_B, name: 'Taxable Soda', quantity: 1, unitPrice: 305 },
        ],
        payments: [{ method: 'cash', amount: 853.8 }],
      });
      // Only the 305.00 line is taxed: 305 * 0.16 = 48.80
      expect(order.subtotal).toBe(805);
      expect(order.tax).toBe(48.8);
      expect(order.total).toBe(853.8);
    });

    it('category tax-rate override applies to that category only', async () => {
      await boot({
        products: {
          [PRODUCT]: {
            _id: PRODUCT,
            shopId: SHOP,
            name: 'Zero-Rated Category Item',
            price: 805,
            cost: 500,
            stock: 10,
            categoryId: CATEGORY,
          },
        },
        settings: {
          tax: { enabled: true, rate: 0.16 },
          taxExemptProducts: [],
          categoryTaxRates: { [CATEGORY]: { rate: 0, exempt: true } },
        },
      });
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [{ method: 'cash', amount: 805 }],
      });
      expect(order.tax).toBe(0);
      expect(order.total).toBe(805);
    });

    it('zero-rated shop (enabled, rate 0) charges no tax', async () => {
      await boot({
        settings: { tax: { enabled: true, rate: 0 } },
      });
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [{ method: 'cash', amount: 805 }],
      });
      expect(order.tax).toBe(0);
      expect(order.total).toBe(805);
    });

    it('tax-inclusive pricing: shelf prices already contain VAT — nothing is added, VAT is extracted', async () => {
      await boot({
        products: {
          [PRODUCT]: {
            _id: PRODUCT,
            shopId: SHOP,
            name: 'VAT-Inclusive Shelf Item',
            price: 933.8, // shelf price, VAT included
            cost: 500,
            stock: 10,
          },
        },
        settings: {
          tax: { enabled: true, rate: 0.16, inclusive: true },
        },
      });
      // Shelf price 933.80 includes VAT: net = 933.80 / 1.16 = 805.00, VAT = 128.80
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(933.8),
        payments: [{ method: 'cash', amount: 933.8 }],
      });
      expect(order.total).toBe(933.8);
      expect(order.tax).toBe(128.8);
      expect(order.paymentStatus).toBe('paid');
    });

    it('settings lookup failure still applies the default 16% (fail-closed, existing behavior)', async () => {
      await boot();
      shopSettingsService.getByShopId.mockRejectedValue(new Error('db down'));
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        payments: [{ method: 'cash', amount: INCIDENT_TOTAL }],
      });
      expect(order.tax).toBe(128.8);
      expect(order.total).toBe(933.8);
    });
  });

  describe('idempotent retry with server-derived allocations', () => {
    it('retry with a different client external hint resolves to the canonical order (no conflict)', async () => {
      const canonical = {
        _id: '507f1f77bcf86cd799439060',
        orderNumber: 'STK-2026-JD2PTR',
        shopId: SHOP,
        customerId: undefined,
        items: [{ productId: PRODUCT, quantity: 1 }],
        // Persisted allocation carries the SERVER-DERIVED amount (933.80).
        payments: [{ method: 'mpesa', amount: 933.8, status: 'pending' }],
        loyaltyPointsRedeemed: 0,
      };
      await boot({ findOneResult: canonical });

      // The retry sends a different client hint (settings loaded by now).
      // It must resolve to the canonical order, not conflict.
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: incidentItems(),
        idempotencyKey: 'retry-key-0001',
        payments: [{ method: 'mpesa', amount: 805, status: 'pending' }],
      });
      expect(order).toBe(canonical);
      expect(orderCtorArgs.length).toBe(0); // no duplicate order persisted
    });

    it('retry that changes the non-external tender is a different logical checkout (conflict)', async () => {
      const canonical = {
        _id: '507f1f77bcf86cd799439060',
        orderNumber: 'STK-2026-JD2PTR',
        shopId: SHOP,
        customerId: undefined,
        items: [{ productId: PRODUCT, quantity: 1 }],
        payments: [{ method: 'cash', amount: 500, status: 'completed' }],
        loyaltyPointsRedeemed: 0,
      };
      await boot({ findOneResult: canonical });

      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: incidentItems(),
          idempotencyKey: 'retry-key-0002',
          payments: [{ method: 'cash', amount: 933.8 }],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
