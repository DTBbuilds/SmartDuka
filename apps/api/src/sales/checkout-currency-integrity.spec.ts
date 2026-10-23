import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { Order } from './schemas/order.schema';
import { Shop } from '../shops/schemas/shop.schema';
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
  nanoid: () => 'CURR01',
}));

/**
 * SMARTDUKA POS-CURRENCY-CHECKOUT-P0 — CHECKOUT CURRENCY & QUOTE INTEGRITY
 *
 * Scenarios proven:
 *  - the order snapshots the shop's base currency AT SALE TIME (KES shop,
 *    AUD shop, and a shop whose currency was misconfigured against its
 *    KES-denominated history);
 *  - the confirmed checkout quote (expectedTotal) is enforced SERVER-SIDE —
 *    a stale cart, a mid-checkout pricing change, or a tampered request is
 *    rejected with NO order created and NO stock mutation;
 *  - absent expectedTotal (legacy clients / offline queue) remains accepted;
 *  - zero-item and zero-total checkouts are refused;
 *  - cash overpayment with change mechanics is clamped to the payable with
 *    change recomputed;
 *  - duplicate submissions resolve to the canonical order.
 */
describe('POS-CURRENCY-CHECKOUT-P0 checkout currency & quote integrity', () => {
  const SHOP_KES = '507f1f77bcf86cd799439011';
  const SHOP_AUD = '507f1f77bcf86cd799439012';
  const USER = '507f1f77bcf86cd799439021';
  const PRODUCT = '507f1f77bcf86cd799439031';

  let service: SalesService;
  let orderCtorArgs: any[];
  let inventoryService: any;
  let shopSettingsService: any;
  let shopModel: any;

  async function boot(
    overrides: {
      shopCurrency?: string;
      settings?: any;
      productPrice?: number;
    } = {},
  ) {
    orderCtorArgs = [];
    const productPrice = overrides.productPrice ?? 625;

    const mockOrderModel: any = jest.fn().mockImplementation((arg: any) => {
      orderCtorArgs.push(arg);
      const doc = {
        _id: '507f1f77bcf86cd799439060',
        ...arg,
        save: jest.fn().mockImplementation(async () => doc),
      };
      return doc;
    });
    mockOrderModel.findOne = jest.fn(async () => null);
    mockOrderModel.find = jest.fn().mockReturnThis();
    mockOrderModel.countDocuments = jest.fn().mockResolvedValue(0);
    mockOrderModel.exec = jest.fn().mockResolvedValue([]);

    shopModel = {
      findById: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockResolvedValue({ currency: overrides.shopCurrency ?? 'KES' }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Shop.name), useValue: shopModel },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn() },
        },
        {
          provide: InventoryService,
          useValue: {
            getProductById: jest.fn().mockResolvedValue({
              _id: PRODUCT,
              shopId: SHOP_KES,
              name: 'InkWave Organic Correction Tape',
              price: productPrice,
              cost: 480,
              stock: 10,
            }),
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
          useValue: { createTransaction: jest.fn().mockResolvedValue({}) },
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
            redeemPoints: jest.fn().mockResolvedValue({}),
            earnPoints: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CustomersService,
          useValue: {
            findByIdForShop: jest.fn().mockResolvedValue(null),
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
    return service;
  }

  const inkWave = (quantity = 1) => [
    {
      productId: PRODUCT,
      name: 'InkWave Organic Correction Tape',
      quantity,
      unitPrice: 625,
    },
  ];

  describe('order currency snapshot', () => {
    it('KES shop: order records currency=KES', async () => {
      await boot({ shopCurrency: 'KES' });
      const order = await service.checkout(SHOP_KES, USER, undefined, {
        items: inkWave(),
        payments: [{ method: 'cash', amount: 725 }],
      });
      expect(order.currency).toBe('KES');
      expect(order.total).toBe(725); // 625 + 16% VAT
    });

    it('AUD shop: order records currency=AUD', async () => {
      await boot({ shopCurrency: 'AUD' });
      const order = await service.checkout(SHOP_AUD, USER, undefined, {
        items: inkWave(),
        payments: [{ method: 'cash', amount: 725 }],
      });
      expect(order.currency).toBe('AUD');
    });

    it('legacy misconfigured shop (AUD config, KES history): new orders still snapshot the CURRENT configured currency — no silent reinterpretation', async () => {
      await boot({ shopCurrency: 'AUD' });
      const order = await service.checkout(SHOP_AUD, USER, undefined, {
        items: inkWave(),
        payments: [{ method: 'cash', amount: 725 }],
      });
      // The order is self-describing: it says AUD because that is what the
      // shop was configured as at sale time. Remediation of the legacy
      // configuration is an explicit, reviewed operation (Part D) — never an
      // automatic reinterpretation.
      expect(order.currency).toBe('AUD');
      expect(order.total).toBe(725);
    });

    it('shop currency lookup failure does not block checkout (currency stays undefined)', async () => {
      await boot();
      shopModel.findById = jest.fn(() => {
        throw new Error('db down');
      });
      const order = await service.checkout(SHOP_KES, USER, undefined, {
        items: inkWave(),
        payments: [{ method: 'cash', amount: 725 }],
      });
      expect(order.currency).toBeUndefined();
      expect(order.total).toBe(725);
    });
  });

  describe('checkout quote integrity (server-side, unbypassable)', () => {
    it('stale cart: confirmed 725.00 but authoritative total moved to 726.16 → 409, no order, no stock mutation', async () => {
      // The product price moved (625 → 626) after the cashier confirmed the
      // quote; the server's authoritative total is now 626 × 1.16 = 726.16.
      await boot({ productPrice: 626 });
      await expect(
        service.checkout(SHOP_KES, USER, undefined, {
          items: inkWave(),
          expectedTotal: 725,
          payments: [{ method: 'cash', amount: 725 }],
        }),
      ).rejects.toThrow(ConflictException);
      expect(orderCtorArgs.length).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('mid-checkout pricing change: client confirmed 625.00 pre-tax, server VAT total 725.00 → 409 (the incident class, server-caught)', async () => {
      await boot();
      await expect(
        service.checkout(SHOP_KES, USER, undefined, {
          items: inkWave(),
          expectedTotal: 625,
          payments: [{ method: 'send_money', amount: 625 }],
        }),
      ).rejects.toThrow(ConflictException);
      expect(orderCtorArgs.length).toBe(0);
    });

    it('matching quote proceeds: expectedTotal 725.00 = authoritative 725.00', async () => {
      await boot();
      const order = await service.checkout(SHOP_KES, USER, undefined, {
        items: inkWave(),
        expectedTotal: 725,
        payments: [{ method: 'cash', amount: 725 }],
      });
      expect(order.total).toBe(725);
      expect(order.paymentStatus).toBe('paid');
      expect(orderCtorArgs.length).toBe(1);
    });

    it('absent expectedTotal (legacy client / offline queue) proceeds unchanged', async () => {
      await boot();
      const order = await service.checkout(SHOP_KES, USER, undefined, {
        items: inkWave(),
        payments: [{ method: 'cash', amount: 725 }],
      });
      expect(order.total).toBe(725);
    });

    it('quote mismatch is rejected BEFORE payment classification — a tampered request cannot buy anything', async () => {
      await boot();
      await expect(
        service.checkout(SHOP_KES, USER, undefined, {
          items: inkWave(),
          expectedTotal: 1,
          payments: [{ method: 'cash', amount: 1 }],
        }),
      ).rejects.toThrow(ConflictException);
      expect(orderCtorArgs.length).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });
  });

  describe('zero-value and tender guards', () => {
    it('empty cart is refused (no order, no stock mutation)', async () => {
      await boot();
      await expect(
        service.checkout(SHOP_KES, USER, undefined, {
          items: [],
          payments: [{ method: 'cash', amount: 0 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(orderCtorArgs.length).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('zero-total is refused (subtotal must be greater than zero)', async () => {
      await boot({ productPrice: 0 });
      await expect(
        service.checkout(SHOP_KES, USER, undefined, {
          items: inkWave(),
          payments: [{ method: 'cash', amount: 0 }],
        }),
      ).rejects.toThrow(/subtotal/i);
      expect(orderCtorArgs.length).toBe(0);
    });

    it('cash overpayment with change mechanics is clamped to the payable and change recomputed', async () => {
      await boot();
      const order = await service.checkout(SHOP_KES, USER, undefined, {
        items: inkWave(),
        payments: [
          {
            method: 'cash',
            amount: 1000,
            amountTendered: 1000,
            change: 0,
          },
        ],
      });
      expect(order.total).toBe(725);
      expect(order.payments[0].amount).toBe(725);
      expect(order.payments[0].change).toBe(275); // 1000 tendered − 725 payable
      expect(order.paymentStatus).toBe('paid');
    });
  });

  describe('duplicate submission', () => {
    it('same idempotency key returns the canonical order (no second order, no second stock mutation)', async () => {
      const canonical = {
        _id: '507f1f77bcf86cd799439060',
        orderNumber: 'STK-2026-CURR01',
        shopId: SHOP_KES,
        customerId: undefined,
        items: [{ productId: PRODUCT, quantity: 1 }],
        payments: [{ method: 'cash', amount: 725, status: 'completed' }],
        loyaltyPointsRedeemed: 0,
      };
      await boot();
      // Wire findOne to resolve the canonical order for the idempotency lookup.
      const mockOrderModel = (service as any).orderModel;
      mockOrderModel.findOne = jest.fn(async () => canonical);

      const order = await service.checkout(SHOP_KES, USER, undefined, {
        items: inkWave(),
        idempotencyKey: 'dup-key-0001',
        payments: [{ method: 'cash', amount: 725 }],
      });
      expect(order).toBe(canonical);
      expect(orderCtorArgs.length).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });
  });
});
