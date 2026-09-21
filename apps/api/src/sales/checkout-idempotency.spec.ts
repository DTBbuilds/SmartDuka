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

jest.mock('nanoid', () => ({ nanoid: () => 'IDEM' }));

/**
 * P0-3C — TENANT-SCOPED CHECKOUT IDEMPOTENCY SHIELD
 *
 * ONE LOGICAL CHECKOUT + ONE STABLE KEY =
 * ONE ORDER / ONE STOCK EFFECT / ONE PAYMENT INITIATION /
 * ONE LOYALTY EFFECT / ONE CUSTOMER-STATS EFFECT.
 */
describe('P0-3C checkout idempotency', () => {
  const SHOP_A = '507f1f77bcf86cd799439011';
  const SHOP_B = '507f1f77bcf86cd799439099';
  const USER_A = '507f1f77bcf86cd799439012';
  const USER_B = '507f1f77bcf86cd799439021';
  const PRODUCT_A = '507f1f77bcf86cd799439031';
  const PRODUCT_B = '507f1f77bcf86cd799439032';
  const CUSTOMER_1 = '507f1f77bcf86cd799439071';
  const CUSTOMER_2 = '507f1f77bcf86cd799439072';
  const KEY = 'idem-key-K1-0001';

  let service: SalesService;
  let orderStore: Map<string, any>;
  let updateStock: jest.Mock;
  let createStockAdjustment: jest.Mock;
  let createTransaction: jest.Mock;
  let earnPoints: jest.Mock;
  let redeemPoints: jest.Mock;
  let updatePurchaseStats: jest.Mock;
  let inventoryService: any;
  let shopSettingsService: any;
  let loyaltyService: any;
  let customersService: any;

  const productA = (overrides: Record<string, any> = {}) => ({
    _id: PRODUCT_A,
    shopId: SHOP_A,
    name: 'Widget',
    price: 100,
    cost: 40,
    stock: 10,
    ...overrides,
  });

  const basePayload = (overrides: Record<string, any> = {}) => ({
    items: [
      { productId: PRODUCT_A, name: 'Widget', quantity: 3, unitPrice: 100 },
    ],
    payments: [{ method: 'cash', amount: 348 }],
    idempotencyKey: KEY,
    ...overrides,
  });

  async function boot(
    opts: {
      products?: Record<string, any>;
      settings?: any;
    } = {},
  ) {
    orderStore = new Map();
    updateStock = jest.fn().mockResolvedValue({ stock: 7 });
    createStockAdjustment = jest.fn().mockResolvedValue({});
    createTransaction = jest.fn().mockResolvedValue({});
    earnPoints = jest
      .fn()
      .mockResolvedValue({ transactions: [{ type: 'earn', amount: 10 }] });
    redeemPoints = jest.fn().mockResolvedValue({});
    updatePurchaseStats = jest.fn().mockResolvedValue({});

    const products = opts.products ?? {
      [`${SHOP_A}|${PRODUCT_A}`]: productA(),
      [`${SHOP_A}|${PRODUCT_B}`]: {
        _id: PRODUCT_B,
        shopId: SHOP_A,
        name: 'Gadget',
        price: 50,
        cost: 20,
        stock: 10,
      },
      [`${SHOP_B}|${PRODUCT_A}`]: {
        _id: PRODUCT_A,
        shopId: SHOP_B,
        name: 'Widget',
        price: 100,
        cost: 40,
        stock: 10,
      },
    };

    const mockOrderModel: any = jest.fn().mockImplementation((arg: any) => {
      const doc: any = {
        _id: `order-${orderStore.size + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...arg,
        save: jest.fn().mockImplementation(async () => {
          if (arg.idempotencyKey) {
            const idx = `${arg.shopId.toString()}|${arg.idempotencyKey}`;
            if (orderStore.has(idx)) {
              const err: any = new Error('E11000 duplicate key');
              err.code = 11000;
              throw err;
            }
            orderStore.set(idx, doc);
          }
          return doc;
        }),
      };
      return doc;
    });
    mockOrderModel.find = jest.fn().mockReturnThis();
    mockOrderModel.findOne = jest
      .fn()
      .mockImplementation(async (query: any) => {
        if (query?.idempotencyKey && query?.shopId) {
          return (
            orderStore.get(
              `${query.shopId.toString()}|${query.idempotencyKey}`,
            ) ?? null
          );
        }
        return null;
      });
    mockOrderModel.countDocuments = jest.fn().mockResolvedValue(0);
    mockOrderModel.sort = jest.fn().mockReturnThis();
    mockOrderModel.skip = jest.fn().mockReturnThis();
    mockOrderModel.limit = jest.fn().mockReturnThis();
    mockOrderModel.exec = jest.fn().mockResolvedValue([]);

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
              .mockImplementation(async (shopId: string, pid: string) => {
                const p =
                  opts.products?.[pid] ?? products[`${shopId}|${pid}`] ?? null;
                return p && p.shopId === shopId ? { ...p } : null;
              }),
            updateStock,
            createStockAdjustment,
          },
        },
        {
          provide: ActivityService,
          useValue: { logActivity: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: PaymentTransactionService,
          useValue: { createTransaction: createTransaction },
        },
        {
          provide: CacheService,
          useValue: { deletePattern: jest.fn(), getOrSet: jest.fn() },
        },
        {
          provide: ShopSettingsService,
          useValue: {
            getByShopId: jest.fn().mockImplementation(
              async (shopId: string) =>
                opts.settings?.[shopId] ?? {
                  tax: { enabled: true, rate: 0.16 },
                },
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
        { provide: LoyaltyService, useValue: { redeemPoints, earnPoints } },
        {
          provide: CustomersService,
          useValue: {
            findByIdForShop: jest
              .fn()
              .mockImplementation(async (shopId: string, id: string) =>
                id === CUSTOMER_1 || id === CUSTOMER_2
                  ? { _id: id, shopId }
                  : null,
              ),
            updatePurchaseStats,
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
    customersService = module.get(CustomersService);
    return service;
  }

  it('persists the idempotency key on the created order', async () => {
    await boot();
    const order = await service.checkout(
      SHOP_A,
      USER_A,
      undefined,
      basePayload(),
    );
    expect(order.idempotencyKey).toBe(KEY);
  });

  describe('same key + same intent', () => {
    it('sequential duplicate returns the canonical original without a second stock effect', async () => {
      await boot();
      const first = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload(),
      );
      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload(),
      );

      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
      expect(updateStock).toHaveBeenCalledWith(SHOP_A, PRODUCT_A, -3, expect.objectContaining({ reason: 'sale' }));
      expect(retry._id).toBe(first._id);
    });

    it('offline replay (response lost, exact stored payload replayed) returns the canonical order', async () => {
      await boot();
      const payload = basePayload();
      const first = await service.checkout(SHOP_A, USER_A, undefined, payload);
      const replay = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        JSON.parse(JSON.stringify(payload)),
      );
      expect(replay._id).toBe(first._id);
      expect(updateStock).toHaveBeenCalledTimes(1);
      expect(createTransaction).toHaveBeenCalledTimes(1);
    });

    it('cash retry: one order, one stock effect, one customer-stats update, one loyalty earn', async () => {
      await boot();
      const payload = basePayload({ customerId: CUSTOMER_1 });
      const first = await service.checkout(SHOP_A, USER_A, undefined, payload);
      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        JSON.parse(JSON.stringify(payload)),
      );

      expect(retry._id).toBe(first._id);
      expect(updateStock).toHaveBeenCalledTimes(1);
      // P0-2: the audit projection lives inside updateStock (mocked here).
      expect(createStockAdjustment).toHaveBeenCalledTimes(0);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
      expect(earnPoints).toHaveBeenCalledTimes(1);
    });
  });

  describe('same key + different intent', () => {
    it('different quantity is rejected with a conflict', async () => {
      await boot();
      await service.checkout(SHOP_A, USER_A, undefined, basePayload());
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({
            items: [
              {
                productId: PRODUCT_A,
                name: 'Widget',
                quantity: 5,
                unitPrice: 100,
              },
            ],
          }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
    });

    it('different product is rejected with a conflict', async () => {
      await boot();
      await service.checkout(SHOP_A, USER_A, undefined, basePayload());
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({
            items: [
              {
                productId: PRODUCT_B,
                name: 'Gadget',
                quantity: 3,
                unitPrice: 100,
              },
            ],
          }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(orderStore.size).toBe(1);
    });

    it('different customer is rejected with a conflict', async () => {
      await boot();
      await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({ customerId: CUSTOMER_1 }),
      );
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({ customerId: CUSTOMER_2 }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
    });

    it('extra item in cart is rejected with a conflict', async () => {
      await boot();
      await service.checkout(SHOP_A, USER_A, undefined, basePayload());
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({
            items: [
              {
                productId: PRODUCT_A,
                name: 'Widget',
                quantity: 3,
                unitPrice: 100,
              },
              {
                productId: PRODUCT_B,
                name: 'Gadget',
                quantity: 1,
                unitPrice: 50,
              },
            ],
          }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(orderStore.size).toBe(1);
    });
  });

  describe('concurrent race', () => {
    it('two simultaneous requests with the same key resolve to ONE canonical order', async () => {
      await boot();
      const [a, b] = await Promise.all([
        service.checkout(SHOP_A, USER_A, undefined, basePayload() as any),
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          JSON.parse(JSON.stringify(basePayload())),
        ),
      ]);

      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
      expect(b._id).toBe(a._id);
    });
  });

  describe('tenant scoping', () => {
    it('different tenants may independently use the same idempotency key', async () => {
      await boot();
      const key = 'shared-key-0001';
      const payloadA = {
        items: [
          { productId: PRODUCT_A, name: 'Widget', quantity: 1, unitPrice: 100 },
        ],
        payments: [{ method: 'cash', amount: 116 }],
        idempotencyKey: key,
      };
      const orderA = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        payloadA,
      );
      const orderB = await service.checkout(
        SHOP_B,
        USER_B,
        undefined,
        payloadA,
      );

      expect(orderStore.size).toBe(2);
      expect(orderB._id).not.toBe(orderA._id);
    });

    it('SHOP_A key K1 can never resolve SHOP_B orders (tenant-scoped lookup)', async () => {
      await boot();
      await service.checkout(SHOP_A, USER_A, undefined, basePayload());
      // SHOP_B retrying the same key does not see SHOP_A's canonical order;
      // it creates its own independent sale.
      const orderB = await service.checkout(
        SHOP_B,
        USER_B,
        undefined,
        basePayload(),
      );
      expect(orderStore.size).toBe(2);
      expect(orderB.idempotencyKey).toBe(KEY);
    });
  });

  describe('server-authority compatibility (P0-3)', () => {
    it('ignored client fields changed on retry do not create a second checkout', async () => {
      await boot();
      const first = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload(),
        'Alice',
      );
      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          items: [
            {
              productId: PRODUCT_A,
              name: 'Forged Name',
              quantity: 3,
              unitPrice: 999,
            },
          ],
          taxRate: 0.9,
          status: 'void',
          cashierId: USER_B,
          cashierName: 'Mallory',
          payments: [
            { method: 'cash', amount: 348, mpesaReceiptNumber: 'FAKE123' },
          ],
        }),
        'Mallory',
      );

      expect(orderStore.size).toBe(1);
      expect(retry._id).toBe(first._id);
      expect(retry.total).toBe(first.total);
      expect(retry.cashierId).toBe(USER_A);
      expect(retry.cashierName).toBe('Alice');
      expect(updateStock).toHaveBeenCalledTimes(1);
    });

    it('price change after first success: retry returns the original canonical sale', async () => {
      await boot();
      const first = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload(),
      );
      expect(first.total).toBe(348);

      // Product price rises to 120 after the first sale
      inventoryService.getProductById.mockResolvedValue(
        productA({ price: 120, stock: 7 }),
      );

      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          items: [
            {
              productId: PRODUCT_A,
              name: 'Widget',
              quantity: 3,
              unitPrice: 999,
            },
          ],
        }),
      );

      expect(retry._id).toBe(first._id);
      expect(retry.total).toBe(348);
      expect(retry.items[0].unitPrice).toBe(100);
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
    });

    it('tax change after first success: retry returns the original tax result', async () => {
      await boot();
      const first = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload(),
      );
      expect(first.tax).toBe(48);

      shopSettingsService.getByShopId.mockResolvedValue({
        tax: { enabled: true, rate: 0.08 },
      });

      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload(),
      );
      expect(retry).toBe(first);
      expect(retry.tax).toBe(48);
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
    });
  });

  describe('payment + loyalty + stats exactly-once', () => {
    it('duplicate M-Pesa checkout does not initiate a second payment transaction', async () => {
      await boot();
      const payload = basePayload({
        payments: [{ method: 'mpesa', amount: 348, status: 'pending' }],
      });
      await service.checkout(SHOP_A, USER_A, undefined, payload);
      await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        JSON.parse(JSON.stringify(payload)),
      );

      expect(orderStore.size).toBe(1);
      expect(createTransaction).toHaveBeenCalledTimes(1);
    });

    it('loyalty and customer stats execute exactly once across retries', async () => {
      await boot();
      const payload = basePayload({
        customerId: CUSTOMER_1,
        loyaltyPointsToRedeem: 10,
      });
      await service.checkout(SHOP_A, USER_A, undefined, payload);
      await service.checkout(SHOP_A, USER_A, undefined, { ...payload });
      await service.checkout(SHOP_A, USER_A, undefined, { ...payload });

      expect(loyaltyService.redeemPoints).toHaveBeenCalledTimes(1);
      expect(earnPoints).toHaveBeenCalledTimes(1);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
    });

    it('legacy clients without a key still check out normally', async () => {
      await boot();
      const payload = basePayload();
      delete payload.idempotencyKey;
      const order = await service.checkout(SHOP_A, USER_A, undefined, payload);
      expect(order.idempotencyKey).toBeUndefined();
      expect(orderStore.size).toBe(0);
      expect(updateStock).toHaveBeenCalledTimes(1);
    });
  });

  describe('P0-3C1 payment-intent fingerprint', () => {
    it('CASH then MPESA under the same key is an idempotency conflict', async () => {
      await boot();
      await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          payments: [{ method: 'cash', amount: 348 }],
        }),
      );
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({
            payments: [{ method: 'mpesa', amount: 348, status: 'pending' }],
          }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
    });

    it('MPESA then CASH under the same key is an idempotency conflict', async () => {
      await boot();
      await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          payments: [{ method: 'mpesa', amount: 348, status: 'pending' }],
        }),
      );
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({
            payments: [{ method: 'cash', amount: 348 }],
          }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(orderStore.size).toBe(1);
      expect(createTransaction).toHaveBeenCalledTimes(1);
    });

    it('split composition change under the same key is a conflict (50/50 split vs 100 cash)', async () => {
      await boot();
      await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          payments: [
            { method: 'cash', amount: 50 },
            { method: 'mpesa', amount: 298, status: 'pending' },
          ],
        }),
      );
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({
            payments: [{ method: 'cash', amount: 348 }],
          }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(orderStore.size).toBe(1);
    });

    it('equivalent split composition in different array order returns the canonical order', async () => {
      await boot();
      const first = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          payments: [
            { method: 'cash', amount: 50 },
            { method: 'mpesa', amount: 298, status: 'pending' },
          ],
        }),
      );
      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          payments: [
            { method: 'mpesa', amount: 298, status: 'pending' },
            { method: 'cash', amount: 50 },
          ],
        }),
      );

      expect(retry._id).toBe(first._id);
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
      expect(createTransaction).toHaveBeenCalledTimes(2);
    });

    it('provider evidence changes with identical method/allocation resolve canonically', async () => {
      await boot();
      const first = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          payments: [
            {
              method: 'mpesa',
              amount: 348,
              status: 'completed',
              mpesaReceiptNumber: 'REALCONF1',
            },
          ],
        }),
      );
      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          payments: [
            {
              method: 'mpesa',
              amount: 348,
              status: 'pending',
              mpesaReceiptNumber: 'FORGED999',
              stripeChargeId: 'ch_fake',
            },
          ],
        }),
      );

      expect(retry._id).toBe(first._id);
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
    });

    it('loyalty redemption intent change under the same key is a conflict', async () => {
      await boot();
      await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload({
          customerId: CUSTOMER_1,
        }),
      );
      await expect(
        service.checkout(
          SHOP_A,
          USER_A,
          undefined,
          basePayload({
            customerId: CUSTOMER_1,
            loyaltyPointsToRedeem: 500,
          }) as any,
        ),
      ).rejects.toThrow(ConflictException);
      // First checkout carried no redemption intent, so no redemption ran;
      // the retry conflicts before any additional side effect.
      expect(loyaltyService.redeemPoints).toHaveBeenCalledTimes(0);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
    });

    it('same intent with identical tender composition returns canonical order (stock/payment once)', async () => {
      await boot();
      const payload = basePayload({
        payments: [
          { method: 'cash', amount: 148 },
          { method: 'mpesa', amount: 100, status: 'pending' },
        ],
      });
      const first = await service.checkout(SHOP_A, USER_A, undefined, payload);
      const retry = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        JSON.parse(JSON.stringify(payload)),
      );

      expect(retry._id).toBe(first._id);
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
      expect(createTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('failure boundaries', () => {
    it('failure before persistence: the same key may legitimately complete on retry', async () => {
      await boot({
        products: {
          [PRODUCT_A]: {
            _id: PRODUCT_A,
            shopId: SHOP_A,
            name: 'X',
            price: 100,
            cost: 40,
            stock: 1,
          },
        },
      });
      await expect(
        service.checkout(SHOP_A, USER_A, undefined, basePayload() as any),
      ).rejects.toThrow('Insufficient stock');
      expect(orderStore.size).toBe(0);

      inventoryService.getProductById.mockResolvedValue(
        productA({ stock: 10 }),
      );
      const order = await service.checkout(
        SHOP_A,
        USER_A,
        undefined,
        basePayload(),
      );
      expect(order.idempotencyKey).toBe(KEY);
      expect(orderStore.size).toBe(1);
    });

    it('stock 10, qty 3, five duplicate submissions -> stock effect exactly once', async () => {
      await boot();
      let last: any;
      for (let i = 0; i < 5; i++) {
        last = await service.checkout(SHOP_A, USER_A, undefined, basePayload());
      }
      expect(orderStore.size).toBe(1);
      expect(updateStock).toHaveBeenCalledTimes(1);
      expect(updateStock).toHaveBeenCalledWith(SHOP_A, PRODUCT_A, -3, expect.objectContaining({ reason: 'sale' }));
      // P0-2: the audit projection lives inside updateStock (mocked here).
      expect(createStockAdjustment).toHaveBeenCalledTimes(0);
      expect(last.items[0].quantity).toBe(3);
    });
  });
});
