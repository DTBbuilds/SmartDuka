import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
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
import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';

describe('SalesService', () => {
  let service: SalesService;
  let orderModel: any;
  let inventoryService: any;
  let activityService: any;
  let paymentTransactionService: any;
  let cacheService: any;
  let shopSettingsService: any;
  let transactionService: any;

  const mockShopId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockBranchId = '507f1f77bcf86cd799439013';

  const mockOrder = {
    _id: '507f1f77bcf86cd799439014',
    shopId: mockShopId,
    orderNumber: 'STK-2024-ABC123',
    items: [
      { productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100, lineTotal: 200 },
    ],
    subtotal: 200,
    tax: 32,
    total: 232,
    status: 'completed',
    paymentStatus: 'paid',
    save: jest.fn().mockResolvedValue(this),
  };

  const mockCheckoutDto = {
    items: [
      { productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100 },
    ],
    payments: [{ method: 'cash', amount: 232 }],
  };

  beforeEach(async () => {
    // Create mock implementations
    let createdOrderDoc: any;
    const mockOrderModel = jest.fn().mockImplementation((doc: any) => {
      createdOrderDoc = doc;
      return {
        ...mockOrder,
        ...doc,
        save: jest.fn().mockResolvedValue({ ...mockOrder, ...doc, _id: mockOrder._id }),
      };
    });
    (mockOrderModel as any).__createdDoc = () => createdOrderDoc;
    mockOrderModel.find = jest.fn().mockReturnThis();
    mockOrderModel.findOne = jest.fn().mockReturnThis();
    mockOrderModel.countDocuments = jest.fn().mockResolvedValue(10);
    mockOrderModel.sort = jest.fn().mockReturnThis();
    mockOrderModel.skip = jest.fn().mockReturnThis();
    mockOrderModel.limit = jest.fn().mockReturnThis();
    mockOrderModel.exec = jest.fn().mockResolvedValue([mockOrder]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getConnectionToken(),
          useValue: {
            startSession: jest.fn().mockResolvedValue({
              withTransaction: jest.fn(),
              endSession: jest.fn(),
            }),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            getProductById: jest.fn().mockResolvedValue({ stock: 100, cost: 50 }),
            updateStock: jest.fn().mockResolvedValue({ stock: 98 }),
            createStockAdjustment: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ActivityService,
          useValue: {
            logActivity: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: PaymentTransactionService,
          useValue: {
            createTransaction: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: CacheService,
          useValue: {
            deletePattern: jest.fn(),
            getOrSet: jest.fn(),
          },
        },
        {
          provide: ShopSettingsService,
          useValue: {
            getByShopId: jest.fn().mockResolvedValue({
              tax: { enabled: true, rate: 0.16 },
            }),
          },
        },
        {
          provide: TransactionService,
          useValue: {
            withTransaction: jest.fn().mockImplementation((fn) => fn(null)),
            checkTransactionSupport: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            awardPoints: jest.fn().mockResolvedValue(undefined),
            getLoyaltyAccount: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CustomersService,
          useValue: {
            findById: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    orderModel = module.get(getModelToken(Order.name));
    inventoryService = module.get(InventoryService);
    activityService = module.get(ActivityService);
    paymentTransactionService = module.get(PaymentTransactionService);
    cacheService = module.get(CacheService);
    shopSettingsService = module.get(ShopSettingsService);
    transactionService = module.get(TransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout', () => {
    it('should throw BadRequestException for empty cart', async () => {
      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, { items: [] })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero subtotal', async () => {
      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [{ productId: 'prod1', name: 'Test', quantity: 0, unitPrice: 0 }],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate stock availability before checkout', async () => {
      inventoryService.getProductById.mockResolvedValue({ stock: 1, cost: 50 });

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [{ productId: 'prod1', name: 'Test Product', quantity: 10, unitPrice: 100 }],
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should get tax rate from shop settings', async () => {
      shopSettingsService.getByShopId.mockResolvedValue({
        tax: { enabled: true, rate: 0.10 }, // 10% tax
      });

      // The service should use 10% tax rate from settings
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(shopSettingsService.getByShopId).toHaveBeenCalledWith(mockShopId);
    });

    it('should use 0% tax when tax is disabled', async () => {
      shopSettingsService.getByShopId.mockResolvedValue({
        tax: { enabled: false, rate: 0.16 },
      });

      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(shopSettingsService.getByShopId).toHaveBeenCalled();
    });

    it('should reduce inventory after successful checkout', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        mockShopId,
        'prod1',
        -2 // Negative for reduction
      );
    });

    it('should create stock adjustment audit trail', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith(
        mockShopId,
        'prod1',
        -2,
        'sale',
        mockUserId,
        expect.stringContaining('Test Product x2')
      );
    });

    it('should log checkout activity', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(activityService.logActivity).toHaveBeenCalled();
      const [logShopId, logUserId, , logRole, logAction, logDetails] =
        activityService.logActivity.mock.calls[0];
      expect(logShopId).toBe(mockShopId);
      expect(logUserId).toBe(mockUserId);
      expect(logRole).toBe('cashier');
      expect(logAction).toBe('checkout');
      expect(logDetails).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          itemCount: 1,
        })
      );
    });

    it('should record payment transactions', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(paymentTransactionService.createTransaction).toHaveBeenCalled();
    });

    it('marks a pending M-Pesa payment as unpaid on the order (pending payments are not confirmed money)', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, {
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100 }],
        payments: [{ method: 'mpesa', amount: 232, status: 'pending' }],
        status: 'pending',
      });

      const createdDoc = orderModel.__createdDoc();
      expect(createdDoc.paymentStatus).toBe('unpaid');
    });

    it('keeps immediate cash checkout marked paid (existing POS behavior)', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      const createdDoc = orderModel.__createdDoc();
      expect(createdDoc.paymentStatus).toBe('paid');
      expect(createdDoc.status).toBe('completed');
    });

    it('marks a split checkout with a confirmed cash part and pending M-Pesa part as partial', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, {
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100 }],
        payments: [
          { method: 'cash', amount: 100, status: 'completed' },
          { method: 'mpesa', amount: 132, status: 'pending' },
        ],
        status: 'pending',
      });

      const createdDoc = orderModel.__createdDoc();
      expect(createdDoc.paymentStatus).toBe('partial');
    });

    it('should invalidate cache after checkout', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(cacheService.deletePattern).toHaveBeenCalledWith(
        `shop:${mockShopId}:orders:*`
      );
    });
  });

  describe('atomic inventory reservation (SDV2-004)', () => {
    function multiItemDto(quantities: Array<{ productId: string; name: string; quantity: number }>) {
      return {
        items: quantities.map((q) => ({ ...q, unitPrice: 100 })),
        payments: [{ method: 'cash', amount: 232 }],
      };
    }

    it('fails deterministically and compensates when a later cart item cannot claim stock', async () => {
      // Product A claims fine; product B has no stock left at claim time.
      inventoryService.updateStock.mockImplementation((_shopId: string, productId: string) =>
        productId === 'prodA'
          ? Promise.resolve({ stock: 8 })
          : Promise.resolve(null), // lost the atomic claim for prodB
      );

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [
            { productId: 'prodA', name: 'Product A', quantity: 2, unitPrice: 100 },
            { productId: 'prodB', name: 'Product B', quantity: 1, unitPrice: 50 },
          ],
          payments: [{ method: 'cash', amount: 289 }],
        }),
      ).rejects.toThrow(BadRequestException);

      // Compensation: product A's claim is released exactly once
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prodA', 2);
      // No sale survives a failed logical checkout
      expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
      expect(activityService.logActivity).not.toHaveBeenCalled();
    });

    it('compensates all claims when order persistence fails after a successful claim phase', async () => {
      orderModel.mockImplementation((doc: any) => ({
        ...mockOrder,
        ...doc,
        save: jest.fn().mockRejectedValue(new Error('write conflict')),
      }));

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [
            { productId: 'prodA', name: 'Product A', quantity: 2, unitPrice: 100 },
            { productId: 'prodB', name: 'Product B', quantity: 1, unitPrice: 50 },
          ],
          payments: [{ method: 'cash', amount: 289 }],
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prodA', 2);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prodB', 1);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prodA', -2);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prodB', -1);
    });

    it('two different-key checkouts competing for the last unit: exactly one succeeds', async () => {
      // Neither idempotency pre-check finds an existing sale
      orderModel.findOne = jest.fn().mockResolvedValue(null);
      // The atomic claim decides the winner: first claim wins, second is null.
      let claims = 0;
      inventoryService.updateStock.mockImplementation(() => {
        claims += 1;
        return claims === 1 ? Promise.resolve({ stock: 0 }) : Promise.resolve(null);
      });

      const results = await Promise.allSettled([
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [{ productId: 'prod1', name: 'Test Product', quantity: 1, unitPrice: 100 }],
          payments: [{ method: 'cash', amount: 116 }],
          idempotencyKey: 'chk-buyer-A',
        }),
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [{ productId: 'prod1', name: 'Test Product', quantity: 1, unitPrice: 100 }],
          payments: [{ method: 'cash', amount: 116 }],
          idempotencyKey: 'chk-buyer-B',
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      // Exactly one inventory claim survived
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledTimes(1);
    });

    it('never decrements stock twice for an offline replay of the same logical checkout', async () => {
      const canonical = {
        _id: '507f1f77bcf86cd799439099',
        shopId: mockShopId,
        orderNumber: 'STK-2026-CANON01',
        idempotencyKey: 'chk-offline-1',
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100, lineTotal: 200 }],
        total: 232,
        status: 'completed',
        paymentStatus: 'paid',
      };
      orderModel.findOne = jest.fn().mockResolvedValue(canonical);

      await service.checkout(mockShopId, mockUserId, mockBranchId, {
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100 }],
        payments: [{ method: 'cash', amount: 232 }],
        idempotencyKey: 'chk-offline-1',
      });

      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('keeps inventory claims tenant-scoped (shop filter present on every claim)', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      // The atomic claim filter is enforced inside updateStock (SDV2-002);
      // checkout must pass the caller's shopId, never another shop's.
      expect(inventoryService.updateStock.mock.calls.every(
        (call: any[]) => call[0] === mockShopId,
      )).toBe(true);
    });

    it('high contention: only claims within available stock succeed, losers fail without side effects', async () => {
      // Neither idempotency pre-check finds an existing sale
      orderModel.findOne = jest.fn().mockResolvedValue(null);
      const STOCK = 5;
      let claims = 0;
      inventoryService.updateStock.mockImplementation(() => {
        // Simulates the atomic conditional claim: succeeds while stock remains
        claims += 1;
        return claims <= STOCK ? Promise.resolve({ stock: STOCK - claims }) : Promise.resolve(null);
      });

      const attempts = Array.from({ length: 20 }, (_, i) =>
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [{ productId: 'prod1', name: 'Test Product', quantity: 1, unitPrice: 100 }],
          payments: [{ method: 'cash', amount: 116 }],
          idempotencyKey: `chk-buyer-${i}`,
        }),
      );

      const settled = await Promise.allSettled(attempts);
      const fulfilled = settled.filter((r) => r.status === 'fulfilled');
      const rejected = settled.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(STOCK);
      expect(rejected).toHaveLength(20 - STOCK);
      // Exactly STOCK successful claims were audited
      const saleAdjustments = inventoryService.createStockAdjustment.mock.calls.filter(
        (call: any[]) => call[3] === 'sale',
      );
      expect(saleAdjustments).toHaveLength(STOCK);
      // Single-item losers never held a claim, so nothing needed compensation
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prod1', -1);
    });
  });

  describe('checkout idempotency (duplicate submission protection)', () => {
    const IDEMPOTENCY_KEY = 'chk-2026-abc123xyz';
    const cashCheckoutWithKey = {
      items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100 }],
      payments: [{ method: 'cash', amount: 232 }],
      idempotencyKey: IDEMPOTENCY_KEY,
    };

    function canonicalOrder(overrides: Record<string, any> = {}) {
      return {
        _id: '507f1f77bcf86cd799439099',
        shopId: mockShopId,
        orderNumber: 'STK-2026-CANON01',
        idempotencyKey: IDEMPOTENCY_KEY,
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100, lineTotal: 200 }],
        total: 232,
        status: 'completed',
        paymentStatus: 'paid',
        ...overrides,
      };
    }

    it('processes a first checkout with an idempotency key normally and persists the key', async () => {
      orderModel.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.checkout(mockShopId, mockUserId, mockBranchId, cashCheckoutWithKey);

      expect(orderModel.findOne).toHaveBeenCalledWith({
        shopId: expect.anything(),
        idempotencyKey: IDEMPOTENCY_KEY,
      });
      expect(orderModel.__createdDoc().idempotencyKey).toBe(IDEMPOTENCY_KEY);
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
    });

    it('returns the canonical original sale for an identical replay without decrementing stock again', async () => {
      const canonical = {
        _id: '507f1f77bcf86cd799439099',
        shopId: mockShopId,
        orderNumber: 'STK-2026-CANON1',
        idempotencyKey: IDEMPOTENCY_KEY,
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100, lineTotal: 200 }],
        total: 232,
        status: 'completed',
        paymentStatus: 'paid',
      };
      orderModel.findOne = jest.fn().mockResolvedValue(canonical);

      const result = await service.checkout(mockShopId, mockUserId, mockBranchId, cashCheckoutWithKey);

      expect(result).toBe(canonical);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
      expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
    });

    it('recovers the canonical sale when a concurrent duplicate loses the uniqueness race', async () => {
      const canonical = canonicalOrder();

      // Two concurrent requests both observe absence, then race on insert.
      orderModel.findOne = jest.fn()
        .mockResolvedValueOnce(null) // pre-check request A
        .mockResolvedValueOnce(null) // pre-check request B
        .mockResolvedValueOnce(canonical); // duplicate-key recovery for request B

      let saveCalls = 0;
      orderModel.mockImplementation((doc: any) => {
        saveCalls += 1;
        const isLosingRequest = saveCalls === 2;
        return {
          ...mockOrder,
          ...doc,
          _id: canonical._id,
          save: isLosingRequest
            ? jest.fn().mockRejectedValue(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }))
            : jest.fn().mockResolvedValue({ ...mockOrder, ...doc, _id: canonical._id }),
        };
      });

      const settled = await Promise.allSettled([
        service.checkout(mockShopId, mockUserId, mockBranchId, { ...cashCheckoutWithKey }),
        service.checkout(mockShopId, mockUserId, mockBranchId, { ...cashCheckoutWithKey }),
      ]);

      expect(settled.every((r) => r.status === 'fulfilled')).toBe(true);
      const [first, second] = settled.map((r) => (r as PromiseFulfilledResult<any>).value);
      // Both requests resolve to the same canonical sale
      expect(first._id).toBe(second._id);
      expect(second).toBe(canonical);
      // Net inventory effect is exactly one claim: the loser's claim is
      // compensated (+2) after losing the uniqueness race.
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prod1', -2);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prod1', 2);
    });

    it('rejects reuse of an idempotency key with a different cart (payload mismatch)', async () => {
      orderModel.findOne = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439099',
        shopId: mockShopId,
        orderNumber: 'STK-2026-CANON1',
        idempotencyKey: IDEMPOTENCY_KEY,
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 1, unitPrice: 100, lineTotal: 100 }],
        total: 116,
        status: 'completed',
        paymentStatus: 'paid',
      });

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, {
          items: [{ productId: 'prod1', name: 'Test Product', quantity: 5, unitPrice: 100 }],
          payments: [{ method: 'cash', amount: 580 }],
          idempotencyKey: IDEMPOTENCY_KEY,
        }),
      ).rejects.toThrow(ConflictException);

      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('does not collide when different shops use the same idempotency key', async () => {
      orderModel.findOne = jest.fn()
        .mockResolvedValueOnce(null) // shop A lookup
        .mockResolvedValueOnce(null); // shop B lookup (scoped by shopId)

      await service.checkout(mockShopId, mockUserId, mockBranchId, cashCheckoutWithKey);
      await service.checkout('507f1f77bcf86cd799439099', mockUserId, mockBranchId, {
        ...cashCheckoutWithKey,
      });

      const lookups = (orderModel.findOne as jest.Mock).mock.calls;
      expect(lookups[0][0].shopId).toEqual(expect.anything());
      expect(lookups[1][0].shopId).toEqual(expect.any(Types.ObjectId));
      // Both shops created their own sale
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(2);
    });

    it('keeps checkout working without an idempotency key (legacy clients)', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(orderModel.findOne).not.toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: expect.anything() }),
      );
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
    });

    it('does not start a second M-Pesa payment chain for a duplicate logical checkout', async () => {
      const canonicalPending = canonicalOrder({ status: 'pending', paymentStatus: 'unpaid', orderNumber: 'STK-2026-MPESA1' });
      orderModel.findOne = jest.fn().mockResolvedValue(canonicalPending);

      await service.checkout(mockShopId, mockUserId, mockBranchId, {
        items: [{ productId: 'prod1', name: 'Test Product', quantity: 2, unitPrice: 100 }],
        payments: [{ method: 'mpesa', amount: 232, status: 'pending' }],
        status: 'pending',
        idempotencyKey: IDEMPOTENCY_KEY,
      });

      // The canonical order is returned; no second sale, no second payment record
      expect(orderModel.findOne).toHaveBeenCalledWith({
        shopId: expect.any(Types.ObjectId),
        idempotencyKey: IDEMPOTENCY_KEY,
      });
      expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('validateStockAvailability', () => {
    it('should return valid for sufficient stock', async () => {
      inventoryService.getProductById.mockResolvedValue({ stock: 100 });

      const result = await (service as any).validateStockAvailability(mockShopId, [
        { productId: 'prod1', name: 'Test', quantity: 5 },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for insufficient stock', async () => {
      inventoryService.getProductById.mockResolvedValue({ stock: 2 });

      const result = await (service as any).validateStockAvailability(mockShopId, [
        { productId: 'prod1', name: 'Test Product', quantity: 5 },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Test Product: Only 2 available, requested 5'
      );
    });

    it('should return invalid for non-existent product', async () => {
      inventoryService.getProductById.mockResolvedValue(null);

      const result = await (service as any).validateStockAvailability(mockShopId, [
        { productId: 'nonexistent', name: 'Missing Product', quantity: 1 },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product "Missing Product" not found');
    });
  });
});

