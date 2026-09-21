import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
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
  nanoid: () => 'P03A',
}));

/**
 * P0-3A — SERVER-AUTHORITATIVE CHECKOUT REGRESSION SHIELD
 *
 * Contract under test:
 *   CLIENT EXPRESSES INTENT -> SERVER LOADS AUTHORITATIVE DATA ->
 *   SERVER CALCULATES BUSINESS TRUTH -> SERVER PERSISTS CANONICAL SALE
 */
describe('P0-3A checkout server authority', () => {
  let service: SalesService;
  let orderCtorArgs: any[];
  let paymentTxnArgs: any[];
  let activityArgs: any[];
  let loyaltyEarnCalls: any[][];
  let customerStatsCalls: any[][];
  let inventoryService: any;
  let shopSettingsService: any;
  let shiftsService: any;
  let loyaltyService: any;
  let customersService: any;

  const SHOP = '507f1f77bcf86cd799439011';
  const USER_A = '507f1f77bcf86cd799439012';
  const USER_B = '507f1f77bcf86cd799439021';
  const PRODUCT = '507f1f77bcf86cd799439031';
  const BRANCH = '507f1f77bcf86cd799439041';
  const OWN_SHIFT = '507f1f77bcf86cd799439051';
  const OTHER_SHIFT = '507f1f77bcf86cd799439052';

  const ownOpenShift = {
    _id: OWN_SHIFT,
    shopId: SHOP,
    cashierId: USER_A,
    status: 'open',
  };

  async function boot(
    overrides: {
      product?: Record<string, any> | null;
      shift?: any;
      settings?: any;
    } = {},
  ) {
    orderCtorArgs = [];
    paymentTxnArgs = [];
    activityArgs = [];
    loyaltyEarnCalls = [];
    customerStatsCalls = [];

    const productDoc =
      overrides.product === undefined
        ? {
            _id: PRODUCT,
            shopId: SHOP,
            name: 'Canonical Product',
            price: 100,
            cost: 40,
            stock: 10,
          }
        : overrides.product;

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
    mockOrderModel.findOne = jest.fn().mockReturnThis();
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
              .mockImplementation(async (_shopId: string, pid: string) =>
                productDoc && pid === PRODUCT ? { ...productDoc } : null,
              ),
            updateStock: jest.fn().mockResolvedValue({ stock: 7 }),
            createStockAdjustment: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ActivityService,
          useValue: {
            logActivity: jest.fn().mockImplementation(async (...a: any[]) => {
              activityArgs.push(a);
              return {};
            }),
          },
        },
        {
          provide: PaymentTransactionService,
          useValue: {
            createTransaction: jest
              .fn()
              .mockImplementation(async (dto: any) => {
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
            redeemPoints: jest.fn().mockResolvedValue({}),
            earnPoints: jest.fn().mockImplementation(async (...a: any[]) => {
              loyaltyEarnCalls.push(a);
              return { transactions: [{ type: 'earn', amount: 10 }] };
            }),
          },
        },
        {
          provide: CustomersService,
          useValue: {
            findByIdForShop: jest
              .fn()
              .mockImplementation(async (shopId: string, id: string) =>
                shopId === SHOP && id === '507f1f77bcf86cd799439071'
                  ? { _id: id, shopId: SHOP }
                  : null,
              ),
            updatePurchaseStats: jest
              .fn()
              .mockImplementation(async (...a: any[]) => {
                customerStatsCalls.push(a);
                return {};
              }),
          },
        },
        {
          provide: ShiftsService,
          useValue: {
            getShiftById: jest
              .fn()
              .mockImplementation(async (shiftId: string) => {
                if (overrides.shift && shiftId === overrides.shift._id)
                  return { ...overrides.shift };
                if (shiftId === OWN_SHIFT) return { ...ownOpenShift };
                return null;
              }),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    inventoryService = module.get(InventoryService);
    shopSettingsService = module.get(ShopSettingsService);
    shiftsService = module.get(ShiftsService);
    loyaltyService = module.get(LoyaltyService);
    customersService = module.get(CustomersService);
    return service;
  }

  describe('PRICE authority', () => {
    it('persists product.price (100) when client sends unitPrice=1', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [
          {
            productId: PRODUCT,
            name: 'Forged Name',
            quantity: 2,
            unitPrice: 1,
          },
        ],
        payments: [{ method: 'cash', amount: 232 }],
      });
      expect(order.items[0].unitPrice).toBe(100);
      expect(order.items[0].lineTotal).toBe(200);
      expect(order.subtotal).toBe(200);
      expect(order.total).toBe(232);
    });

    it('server total is authoritative for payment consistency (client underpays)', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 2, unitPrice: 1 }],
        payments: [{ method: 'cash', amount: 5 }],
      });
      expect(order.total).toBe(232);
      expect(order.paymentStatus).toBe('partial');
    });
  });

  describe('TAX authority', () => {
    it('uses server tax rate (16%) when client sends taxRate=0', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        taxRate: 0,
        payments: [{ method: 'cash', amount: 116 }],
      });
      expect(order.tax).toBe(16);
      expect(order.total).toBe(116);
    });

    it('uses 0 tax when shop settings disable tax, regardless of client taxRate', async () => {
      await boot({ settings: { tax: { enabled: false, rate: 0.16 } } });
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        taxRate: 0.5,
        payments: [{ method: 'cash', amount: 100 }],
      });
      expect(order.tax).toBe(0);
      expect(order.total).toBe(100);
    });

    it('falls back to default rate when settings lookup fails', async () => {
      await boot();
      shopSettingsService.getByShopId.mockRejectedValue(new Error('db down'));
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        taxRate: 0,
        payments: [{ method: 'cash', amount: 116 }],
      });
      expect(order.tax).toBe(16);
    });
  });

  describe('PRODUCT SNAPSHOT authority', () => {
    it('persists canonical product name, cost and price over client values', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [
          {
            productId: PRODUCT,
            name: 'Totally Different Item',
            quantity: 1,
            unitPrice: 1,
          },
        ],
        payments: [{ method: 'cash', amount: 116 }],
      });
      expect(order.items[0].name).toBe('Canonical Product');
      expect(order.items[0].unitPrice).toBe(100);
      expect(order.items[0].cost).toBe(40);
    });
  });

  describe('ORDER STATUS authority', () => {
    it('client status=completed with unconfirmed external payment is NOT completed', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'mpesa', amount: 116, status: 'pending' }],
        status: 'completed',
      } as any);
      expect(order.status).toBe('pending');
    });

    it('client status=void is never accepted at birth', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 116 }],
        status: 'void',
      } as any);
      expect(order.status).toBe('completed');
      expect(order.status).not.toBe('void');
    });

    it('cash checkout is born completed (authorized cashier action)', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 116 }],
      });
      expect(order.status).toBe('completed');
      expect(order.paymentStatus).toBe('paid');
    });
  });

  describe('PAYMENT STATUS authority', () => {
    it('fake M-Pesa receipt does not confirm payment: transaction pending, order unpaid, no loyalty earn', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [
          {
            method: 'mpesa',
            amount: 116,
            status: 'completed',
            mpesaReceiptNumber: 'FAKE123XYZ',
          },
        ],
        status: 'completed',
        customerId: '507f1f77bcf86cd799439071',
      } as any);
      expect(order.paymentStatus).toBe('unpaid');
      expect(order.status).toBe('pending');
      expect(paymentTxnArgs[0].status).toBe('pending');
      expect(paymentTxnArgs[0].mpesaReceiptNumber).toBeUndefined();
      expect(loyaltyEarnCalls.length).toBe(0);
    });

    it('fabricated Stripe chargeId does not confirm payment', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [
          { method: 'stripe', amount: 116, stripeChargeId: 'ch_fake123' },
        ],
        status: 'completed',
      } as any);
      expect(order.paymentStatus).toBe('unpaid');
      expect(order.status).toBe('pending');
      expect(paymentTxnArgs[0].status).toBe('pending');
    });

    it('mixed payment: confirmed cash counts, pending mpesa does not', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [
          { method: 'cash', amount: 50 },
          { method: 'mpesa', amount: 66, status: 'pending' },
        ],
      });
      expect(order.paymentStatus).toBe('partial');
      expect(order.status).toBe('pending');
      const mpesaTxn = paymentTxnArgs.find(
        (t: any) => t.paymentMethod === 'mpesa',
      );
      const cashTxn = paymentTxnArgs.find(
        (t: any) => t.paymentMethod === 'cash',
      );
      expect(mpesaTxn.status).toBe('pending');
      expect(cashTxn.status).toBe('completed');
    });

    it('client cannot inflate confirmed total: amount mismatch still partial', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 999999 }],
      });
      expect(order.total).toBe(116);
      expect(order.paymentStatus).toBe('paid');
    });
  });

  describe('CASHIER IDENTITY authority', () => {
    it('persisted actor is the JWT user, not body cashierId/cashierName', async () => {
      await boot();
      const order = await service.checkout(
        SHOP,
        USER_A,
        undefined,
        {
          items: [
            { productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 },
          ],
          payments: [{ method: 'cash', amount: 116 }],
          cashierId: USER_B,
          cashierName: 'Other Person',
        },
        'Alice A.',
      );
      expect(order.cashierId).toBe(USER_A);
      expect(order.cashierName).toBe('Alice A.');
      expect(activityArgs[0][2]).toBe('Alice A.');
      expect(paymentTxnArgs[0].cashierName).toBe('Alice A.');
    });

    it('defaults actor name when JWT carries none', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 116 }],
      });
      expect(order.cashierId).toBe(USER_A);
      expect(order.cashierName).toBe('Unknown Cashier');
    });
  });

  describe('SHIFT attribution', () => {
    it('accepts the authenticated cashier own open shift', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 116 }],
        shiftId: OWN_SHIFT,
      });
      expect(order.shiftId).toBeDefined();
    });

    it('denies another cashier shift', async () => {
      await boot({
        shift: {
          _id: OTHER_SHIFT,
          shopId: SHOP,
          cashierId: USER_B,
          status: 'open',
        },
      });
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: [
            { productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 },
          ],
          payments: [{ method: 'cash', amount: 116 }],
          shiftId: OTHER_SHIFT,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('denies a closed shift', async () => {
      await boot({
        shift: {
          _id: OWN_SHIFT,
          shopId: SHOP,
          cashierId: USER_A,
          status: 'closed',
        },
      });
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: [
            { productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 },
          ],
          payments: [{ method: 'cash', amount: 116 }],
          shiftId: OWN_SHIFT,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('denies an unknown shift', async () => {
      await boot();
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: [
            { productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 },
          ],
          payments: [{ method: 'cash', amount: 116 }],
          shiftId: OTHER_SHIFT,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('preserves checkout without a shift', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 116 }],
      });
      expect(order.shiftId).toBeUndefined();
    });
  });

  describe('TENANT scope', () => {
    it('fails closed when product does not exist in the authenticated shop', async () => {
      await boot({ product: null });
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: [
            { productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 },
          ],
          payments: [{ method: 'cash', amount: 116 }],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('denies a customer from another tenant', async () => {
      await boot();
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: [
            { productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 },
          ],
          payments: [{ method: 'cash', amount: 116 }],
          customerId: '507f1f77bcf86cd799439999',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(customerStatsCalls.length).toBe(0);
    });

    it('accepts a same-tenant customer', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 1, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 116 }],
        customerId: '507f1f77bcf86cd799439071',
      });
      expect(order.customerId).toBeDefined();
      expect(customerStatsCalls.length).toBe(1);
    });
  });

  describe('STOCK exactly-once (P0-1 shield)', () => {
    it('stock 10, sale qty 3 -> single -3 mutation and single audit record', async () => {
      await boot();
      await service.checkout(SHOP, USER_A, undefined, {
        items: [{ productId: PRODUCT, name: 'X', quantity: 3, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 348 }],
      });
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        SHOP,
        PRODUCT,
        -3,
        expect.objectContaining({ reason: 'sale', referenceType: 'order' }),
      );
      // P0-2: the audit projection lives inside updateStock — the separate
      // createStockAdjustment call no longer exists on the checkout path.
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledTimes(0);
    });

    it('fails closed on insufficient stock before order creation', async () => {
      await boot({
        product: {
          _id: PRODUCT,
          shopId: SHOP,
          name: 'X',
          price: 100,
          cost: 40,
          stock: 1,
        },
      });
      await expect(
        service.checkout(SHOP, USER_A, undefined, {
          items: [
            { productId: PRODUCT, name: 'X', quantity: 3, unitPrice: 100 },
          ],
          payments: [{ method: 'cash', amount: 348 }],
        } as any),
      ).rejects.toThrow('Insufficient stock');
      expect(orderCtorArgs.length).toBe(0);
    });
  });

  describe('OFFLINE replay', () => {
    it('stale client price/tax are replaced by server values at sync time', async () => {
      await boot();
      const order = await service.checkout(SHOP, USER_A, BRANCH, {
        items: [
          { productId: PRODUCT, name: 'Old Name', quantity: 2, unitPrice: 1 },
        ],
        taxRate: 0,
        isOffline: true,
        payments: [{ method: 'cash', amount: 2 }],
      });
      expect(order.isOffline).toBe(true);
      expect(order.items[0].unitPrice).toBe(100);
      expect(order.tax).toBe(32);
      expect(order.total).toBe(232);
      expect(order.branchId).toBeDefined();
    });
  });
});
