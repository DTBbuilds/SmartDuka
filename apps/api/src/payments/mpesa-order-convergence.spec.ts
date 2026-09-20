import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaymentTransactionService } from '../payments/services/payment-transaction.service';
import { PaymentTransaction } from '../payments/schemas/payment-transaction.schema';
import { MpesaTransaction } from '../payments/schemas/mpesa-transaction.schema';
import { Order } from '../sales/schemas/order.schema';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { CacheService } from '../common/services/cache.service';
import { ShopSettingsService } from '../shop-settings/shop-settings.service';
import { TransactionService } from '../common/services/transaction.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';
import { ShiftsService } from '../shifts/shifts.service';
import { SalesService } from '../sales/sales.service';

jest.mock('nanoid', () => ({ nanoid: () => 'CONV' }));

/**
 * P0-3E — M-PESA ORDER/PAYMENT CONVERGENCE SHIELD
 *
 * Provider-confirmed payment truth converges the canonical order exactly once:
 * payment state, lifecycle state, loyalty, customer stats. Zero inventory
 * mutation at confirmation time. Monotonic transitions; tenant-scoped.
 */
describe('P0-3E mpesa order/payment convergence', () => {
  const SHOP_A = '507f1f77bcf86cd799439011';
  const SHOP_B = '507f1f77bcf86cd799439099';
  const USER = '507f1f77bcf86cd799439012';
  const CUSTOMER = '507f1f77bcf86cd799439071';
  const PRODUCT = '507f1f77bcf86cd799439031';
  const ORDER_ID = '507f1f77bcf86cd799439061';
  const CRX = 'CRX-REQUEST-1';

  let moduleRef: TestingModule;
  let paymentTxnService: PaymentTransactionService;
  let salesService: SalesService;
  let orderDoc: any;
  let payTxnStore: Map<string, any>;
  let payTxnSeq: number;
  let earnPoints: jest.Mock;
  let redeemPoints: jest.Mock;
  let updatePurchaseStats: jest.Mock;
  let updateStock: jest.Mock;
  let createStockAdjustment: jest.Mock;
  let orderUpdateOne: jest.Mock;

  const mpesaDto = (overrides: Record<string, any> = {}) => ({
    shopId: SHOP_A,
    orderId: ORDER_ID,
    orderNumber: 'STK-2026-CONV1',
    cashierId: USER,
    cashierName: 'Alice',
    paymentMethod: 'mpesa' as const,
    amount: 1000,
    status: 'completed' as const,
    mpesaTransactionId: CRX,
    mpesaReceiptNumber: 'RECEIPT01',
    ...overrides,
  });

  async function boot(orderOverrides: Record<string, any> = {}) {
    orderDoc = {
      _id: ORDER_ID,
      shopId: new Types.ObjectId(SHOP_A),
      orderNumber: 'STK-2026-CONV1',
      status: 'pending',
      paymentStatus: 'unpaid',
      total: 1000,
      customerId: undefined,
      loyaltyPointsRedeemed: 0,
      items: [
        {
          productId: PRODUCT,
          name: 'Widget',
          quantity: 1,
          unitPrice: 1000,
          lineTotal: 1000,
          cost: 400,
        },
      ],
      payments: [{ method: 'mpesa', amount: 1000, status: 'pending' }],
      ...orderOverrides,
    };
    payTxnStore = new Map();
    payTxnSeq = 0;
    earnPoints = jest
      .fn()
      .mockResolvedValue({ transactions: [{ type: 'earn', amount: 10 }] });
    redeemPoints = jest.fn().mockResolvedValue({});
    updatePurchaseStats = jest.fn().mockResolvedValue({});
    updateStock = jest.fn().mockResolvedValue({ stock: 7 });
    createStockAdjustment = jest.fn().mockResolvedValue({});

    const mockPayTxnModel: any = jest.fn().mockImplementation((arg: any) => {
      const doc: any = {
        _id: `ptxn-${++payTxnSeq}`,
        ...arg,
        save: jest.fn().mockImplementation(async () => {
          const idx = arg.mpesaTransactionId ?? `unkeyed-${payTxnSeq}`;
          if (payTxnStore.has(idx)) {
            const err: any = new Error('E11000 duplicate key');
            err.code = 11000;
            throw err;
          }
          payTxnStore.set(idx, doc);
          return doc;
        }),
      };
      return doc;
    });
    mockPayTxnModel.findOne = jest.fn().mockImplementation((q: any) => ({
      exec: async () =>
        q?.mpesaTransactionId
          ? (payTxnStore.get(q.mpesaTransactionId) ?? null)
          : null,
    }));
    mockPayTxnModel.find = jest.fn().mockReturnThis();
    mockPayTxnModel.countDocuments = jest.fn().mockResolvedValue(0);
    mockPayTxnModel.sort = jest.fn().mockReturnThis();
    mockPayTxnModel.skip = jest.fn().mockReturnThis();
    mockPayTxnModel.limit = jest.fn().mockReturnThis();
    mockPayTxnModel.exec = jest.fn().mockResolvedValue([]);

    const mockMpesaTxnModel: any = jest.fn().mockImplementation(() => ({}));
    mockMpesaTxnModel.findOne = jest.fn().mockResolvedValue(null);
    mockMpesaTxnModel.find = jest.fn().mockReturnThis();

    // Shared mutable order store used by BOTH the convergence path and the
    // sales idempotency path.
    const orderById = new Map<string, any>();
    const orderByKey = new Map<string, any>();
    orderById.set(ORDER_ID, orderDoc);
    if (orderDoc.idempotencyKey) {
      orderByKey.set(`${SHOP_A}|${orderDoc.idempotencyKey}`, orderDoc);
    }
    const mockOrderModel: any = jest.fn().mockImplementation((arg: any) => {
      const doc: any = {
        _id: `507f1f77bcf86cd7994390${orderById.size.toString(16).padStart(2, '0')}`,
        ...arg,
        save: jest.fn().mockImplementation(async () => {
          orderById.set(doc._id, doc);
          if (arg.idempotencyKey) {
            orderByKey.set(
              `${arg.shopId.toString()}|${arg.idempotencyKey}`,
              doc,
            );
          }
          return doc;
        }),
      };
      return doc;
    });
    mockOrderModel.findOne = jest.fn().mockImplementation((q: any) => {
      // Mongoose queries are thenable AND expose .exec(); both call styles
      // must work (sales awaits the query, payment sync awaits .exec()).
      const result = (async () => {
        if (q?.idempotencyKey && q?.shopId) {
          return (
            orderByKey.get(`${q.shopId.toString()}|${q.idempotencyKey}`) ?? null
          );
        }
        const byId = orderById.get(q?._id?.toString());
        return byId && byId.shopId.toString() === q?.shopId?.toString()
          ? byId
          : null;
      })();
      (result as any).exec = async () => result;
      return result;
    });
    orderUpdateOne = jest
      .fn()
      .mockImplementation(async (filter: any, update: any) => {
        // Atomic claim simulation: only matches when the order is still pending
        // and the tenant matches.
        const target = orderById.get(filter._id.toString());
        if (!target) return { modifiedCount: 0 };
        if (target.shopId.toString() !== filter.shopId.toString())
          return { modifiedCount: 0 };
        if (target.status !== filter.status) return { modifiedCount: 0 };
        target.paymentStatus = update.$set.paymentStatus;
        if (update.$set.status) target.status = update.$set.status;
        if (update.$set['payments.$[p].status']) {
          for (const p of target.payments ?? []) {
            if (p.method === 'mpesa' && p.status === 'pending') {
              p.status = update.$set['payments.$[p].status'];
              if (update.$set['payments.$[p].mpesaReceiptNumber']) {
                p.mpesaReceiptNumber =
                  update.$set['payments.$[p].mpesaReceiptNumber'];
              }
            }
          }
        }
        return { modifiedCount: 1 };
      });
    mockOrderModel.updateOne = orderUpdateOne;
    mockOrderModel.find = jest.fn().mockReturnThis();
    mockOrderModel.countDocuments = jest.fn().mockResolvedValue(0);
    mockOrderModel.sort = jest.fn().mockReturnThis();
    mockOrderModel.skip = jest.fn().mockReturnThis();
    mockOrderModel.limit = jest.fn().mockReturnThis();
    mockOrderModel.exec = jest.fn().mockResolvedValue([]);

    moduleRef = await Test.createTestingModule({
      providers: [
        PaymentTransactionService,
        SalesService,
        {
          provide: getModelToken(PaymentTransaction.name),
          useValue: mockPayTxnModel,
        },
        {
          provide: getModelToken(MpesaTransaction.name),
          useValue: mockMpesaTxnModel,
        },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        {
          provide: getConnectionToken(),
          useValue: { startSession: jest.fn() },
        },
        {
          provide: InventoryService,
          useValue: {
            getProductById: jest.fn().mockResolvedValue({
              _id: PRODUCT,
              shopId: SHOP_A,
              name: 'Widget',
              price: 348,
              cost: 140,
              stock: 7,
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
          provide: CacheService,
          useValue: { deletePattern: jest.fn(), getOrSet: jest.fn() },
        },
        {
          provide: ShopSettingsService,
          useValue: {
            getByShopId: jest
              .fn()
              .mockResolvedValue({ tax: { enabled: false, rate: 0.16 } }),
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
            findByIdForShop: jest.fn().mockResolvedValue({ _id: CUSTOMER }),
            updatePurchaseStats,
          },
        },
        {
          provide: ShiftsService,
          useValue: { getShiftById: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    paymentTxnService = moduleRef.get(PaymentTransactionService);
    salesService = moduleRef.get(SalesService);
    return paymentTxnService;
  }

  describe('convergence states', () => {
    it('full payment: 1000 order + 1000 confirmed -> paid + completed', async () => {
      await boot();
      await paymentTxnService.createTransaction(mpesaDto());
      expect(orderDoc.paymentStatus).toBe('paid');
      expect(orderDoc.status).toBe('completed');
    });

    it('underpayment: 1000 order + 600 confirmed -> partial, NOT completed', async () => {
      await boot();
      await paymentTxnService.createTransaction(mpesaDto({ amount: 600 }));
      expect(orderDoc.paymentStatus).toBe('partial');
      expect(orderDoc.status).toBe('pending');
    });

    it('split full: confirmed cash 400 at checkout + mpesa 600 -> paid + completed', async () => {
      await boot({
        payments: [
          { method: 'cash', amount: 400, status: 'completed' },
          { method: 'mpesa', amount: 600, status: 'pending' },
        ],
        paymentStatus: 'partial',
      });
      await paymentTxnService.createTransaction(mpesaDto({ amount: 600 }));
      expect(orderDoc.paymentStatus).toBe('paid');
      expect(orderDoc.status).toBe('completed');
    });

    it('split short: cash 400 + mpesa 300 -> 700 confirmed -> partial/pending', async () => {
      await boot({
        payments: [
          { method: 'cash', amount: 400, status: 'completed' },
          { method: 'mpesa', amount: 300, status: 'pending' },
        ],
        paymentStatus: 'partial',
      });
      await paymentTxnService.createTransaction(mpesaDto({ amount: 300 }));
      expect(orderDoc.paymentStatus).toBe('partial');
      expect(orderDoc.status).toBe('pending');
    });

    it('overpayment: confirmed 1200 on 1000 order -> paid, Order.total unchanged', async () => {
      await boot();
      await paymentTxnService.createTransaction(mpesaDto({ amount: 1200 }));
      expect(orderDoc.paymentStatus).toBe('paid');
      expect(orderDoc.status).toBe('completed');
      expect(orderDoc.total).toBe(1000);
    });
  });

  describe('order payments[] snapshot convergence', () => {
    it('matching mpesa entry converges to completed with the provider receipt', async () => {
      await boot();
      await paymentTxnService.createTransaction(mpesaDto());
      expect(orderDoc.payments[0].status).toBe('completed');
      expect(orderDoc.payments[0].mpesaReceiptNumber).toBe('RECEIPT01');
    });
  });

  describe('duplicate callback safety', () => {
    it('same success callback x5 -> one PaymentTransaction, side effects once', async () => {
      await boot({ customerId: new Types.ObjectId(CUSTOMER) });
      for (let i = 0; i < 5; i++) {
        await paymentTxnService.createTransaction(mpesaDto());
      }
      expect(payTxnStore.size).toBe(1);
      expect(orderUpdateOne).toHaveBeenCalledTimes(1);
      expect(earnPoints).toHaveBeenCalledTimes(1);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
      expect(orderDoc.status).toBe('completed');
    });

    it('callback + status-query race (same CheckoutRequestID) -> one convergence', async () => {
      await boot({ customerId: new Types.ObjectId(CUSTOMER) });
      const [a, b] = await Promise.all([
        paymentTxnService.createTransaction(mpesaDto()),
        paymentTxnService.createTransaction(
          mpesaDto({ mpesaReceiptNumber: 'RECEIPT01' }),
        ),
      ]);
      expect(a._id).toBe(b._id);
      expect(payTxnStore.size).toBe(1);
      expect(earnPoints).toHaveBeenCalledTimes(1);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
      expect(orderDoc.status).toBe('completed');
    });
  });

  describe('tenant + linkage safety', () => {
    it('wrong tenant: SHOP_B transaction never updates SHOP_A order', async () => {
      await boot();
      await paymentTxnService.createTransaction(mpesaDto({ shopId: SHOP_B }));
      expect(orderDoc.status).toBe('pending');
      expect(orderDoc.paymentStatus).toBe('unpaid');
      expect(earnPoints).toHaveBeenCalledTimes(0);
    });

    it('unknown order: fails safe (logged, no throw, no side effects)', async () => {
      await boot();
      await paymentTxnService.createTransaction(
        mpesaDto({ orderId: '507f1f77bcf86cd799439999' }),
      );
      expect(orderDoc.status).toBe('pending');
      expect(earnPoints).toHaveBeenCalledTimes(0);
    });
  });

  describe('monotonic lifecycle guard', () => {
    it('voided order + late provider success: no reopen, payment recorded', async () => {
      await boot({ status: 'void', customerId: new Types.ObjectId(CUSTOMER) });
      const txn = await paymentTxnService.createTransaction(mpesaDto());
      expect(txn).toBeDefined();
      expect(payTxnStore.size).toBe(1);
      expect(orderDoc.status).toBe('void');
      expect(orderDoc.paymentStatus).toBe('unpaid');
      expect(earnPoints).toHaveBeenCalledTimes(0);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(0);
    });

    it('already-completed order: late callback changes nothing', async () => {
      await boot({ status: 'completed', paymentStatus: 'paid' });
      await paymentTxnService.createTransaction(mpesaDto());
      expect(orderUpdateOne).toHaveBeenCalledTimes(0);
      expect(earnPoints).toHaveBeenCalledTimes(0);
    });

    it('failed callback (status failed) never converges the order', async () => {
      await boot();
      await paymentTxnService.createTransaction(
        mpesaDto({ status: 'failed' as any }),
      );
      expect(orderDoc.status).toBe('pending');
      expect(orderDoc.paymentStatus).toBe('unpaid');
    });

    it('pending payment record (checkout-time intent) never converges the order', async () => {
      await boot();
      await paymentTxnService.createTransaction(
        mpesaDto({ status: 'pending' as const }),
      );
      expect(orderDoc.status).toBe('pending');
      expect(orderDoc.paymentStatus).toBe('unpaid');
    });
  });

  describe('side-effect boundaries', () => {
    it('no customer: convergence completes the order without loyalty/stats', async () => {
      await boot();
      await paymentTxnService.createTransaction(mpesaDto());
      expect(orderDoc.status).toBe('completed');
      expect(orderDoc.paymentStatus).toBe('paid');
      expect(earnPoints).toHaveBeenCalledTimes(0);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(0);
    });

    it('inventory: confirmation performs ZERO stock mutation', async () => {
      await boot();
      await paymentTxnService.createTransaction(mpesaDto());
      for (let i = 0; i < 3; i++) {
        await paymentTxnService.createTransaction(mpesaDto());
      }
      expect(updateStock).toHaveBeenCalledTimes(0);
      expect(createStockAdjustment).toHaveBeenCalledTimes(0);
    });

    it('partial convergence then completing payment: loyalty/stats exactly once', async () => {
      await boot({ customerId: new Types.ObjectId(CUSTOMER) });
      await paymentTxnService.createTransaction(
        mpesaDto({ amount: 600, mpesaTransactionId: 'CRX-P1' }),
      );
      expect(orderDoc.paymentStatus).toBe('partial');
      expect(earnPoints).toHaveBeenCalledTimes(0);

      await paymentTxnService.createTransaction(
        mpesaDto({ amount: 400, mpesaTransactionId: 'CRX-P2' }),
      );
      expect(orderDoc.paymentStatus).toBe('paid');
      expect(orderDoc.status).toBe('completed');
      expect(earnPoints).toHaveBeenCalledTimes(1);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkout idempotency lifecycle (P0-3D preserved)', () => {
    it('checkout K1 -> pending order; retry K1 -> same order; confirmation -> completed; retry K1 -> same completed order', async () => {
      await boot({
        customerId: new Types.ObjectId(CUSTOMER),
        total: 348,
        payments: [{ method: 'mpesa', amount: 348, status: 'pending' }],
      });
      const payload = {
        items: [
          { productId: PRODUCT, name: 'Widget', quantity: 1, unitPrice: 348 },
        ],
        payments: [{ method: 'mpesa', amount: 348, status: 'pending' }],
        idempotencyKey: 'K1',
        customerId: CUSTOMER,
      };

      const first = await salesService.checkout(
        SHOP_A,
        USER,
        undefined,
        payload,
      );
      const retryBefore = await salesService.checkout(SHOP_A, USER, undefined, {
        ...payload,
      });
      expect(retryBefore._id).toBe(first._id);

      // Provider confirmation converges the canonical order
      await paymentTxnService.createTransaction(
        mpesaDto({
          amount: 348,
          orderId: first._id,
          orderNumber: first.orderNumber,
        }),
      );
      expect(first.status).toBe('completed');
      expect(first.paymentStatus).toBe('paid');

      const retryAfter = await salesService.checkout(SHOP_A, USER, undefined, {
        ...payload,
      });
      expect(retryAfter._id).toBe(first._id);
      expect(updateStock).toHaveBeenCalledTimes(1);
      expect(updateStock).toHaveBeenCalledWith(SHOP_A, PRODUCT, -1);
    });
  });
});
