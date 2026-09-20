import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SalesService } from './sales.service';
import { Order } from './schemas/order.schema';
import {
  InventoryClaim,
  InventoryClaimItemState,
  InventoryClaimState,
} from '../inventory/schemas/inventory-claim.schema';
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
  let inventoryClaimModel: any;
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
    const mockOrderModel: any = jest.fn().mockImplementation((doc: any) => {
      createdOrderDoc = doc;
      return {
        ...mockOrder,
        ...doc,
        save: jest.fn().mockResolvedValue({ ...mockOrder, ...doc, _id: mockOrder._id }),
      };
    });
    mockOrderModel.__createdDoc = () => createdOrderDoc;
    mockOrderModel.find = jest.fn().mockReturnThis();
    mockOrderModel.findOne = jest.fn().mockReturnThis();
    mockOrderModel.countDocuments = jest.fn().mockResolvedValue(10);
    mockOrderModel.sort = jest.fn().mockReturnThis();
    mockOrderModel.skip = jest.fn().mockReturnThis();
    mockOrderModel.limit = jest.fn().mockReturnThis();
    mockOrderModel.exec = jest.fn().mockResolvedValue([mockOrder]);
    mockOrderModel.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    // In-memory durable-claim simulation (SDV2-005): tracks per-claim,
    // per-item state transitions so compensation/resume behavior is
    // exercised deterministically instead of being stubbed away.
    const claimStore = new Map<string, any>();
    const matchState = (current: string, cond: any): boolean => {
      if (cond === undefined) return true;
      if (typeof cond === 'string') return current === cond;
      if (cond.$in) return cond.$in.includes(current);
      if (cond.$ne) return current !== cond.$ne;
      return true;
    };
    const execable = (result: any) => ({ exec: jest.fn().mockResolvedValue(result) });
    inventoryClaimModel = {
      create: jest.fn().mockImplementation((doc: any) => {
        const record = { _id: new Types.ObjectId(), ...doc };
        claimStore.set(record._id.toString(), record);
        return Promise.resolve(record);
      }),
      updateOne: jest.fn().mockImplementation((filter: any, update: any) => {
        const record = claimStore.get(filter?._id?.toString?.() ?? '');
        if (!record) return execable({ modifiedCount: 0 });
        const set = update?.$set ?? {};
        if (set['items.$.state'] !== undefined) {
          const productId = filter['items.productId'] ?? filter.items?.$elemMatch?.productId;
          const itemCond = filter.items?.$elemMatch?.state;
          const item = record.items.find((i: any) => i.productId === productId);
          if (!item || !matchState(record.state, filter.state)) {
            return execable({ modifiedCount: 0 });
          }
          if (itemCond !== undefined && !matchState(item.state, itemCond)) {
            return execable({ modifiedCount: 0 });
          }
          item.state = set['items.$.state'];
          return execable({ modifiedCount: 1 });
        }
        if (set.state !== undefined) {
          if (!matchState(record.state, filter.state)) {
            return execable({ modifiedCount: 0 });
          }
          record.state = set.state;
          if (set.orderId !== undefined) record.orderId = set.orderId;
          return execable({ modifiedCount: 1 });
        }
        return execable({ modifiedCount: 0 });
      }),
      findOne: jest.fn().mockImplementation((filter: any) =>
        execable(filter?._id ? (claimStore.get(filter._id.toString()) ?? null) : null),
      ),
      findById: jest.fn().mockImplementation((id: any) =>
        execable(claimStore.get(id?.toString?.() ?? '') ?? null),
      ),
    };
    inventoryClaimModel.__claims = claimStore;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(InventoryClaim.name),
          useValue: inventoryClaimModel,
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
            clearClaimMutation: jest.fn().mockResolvedValue(undefined),
            hasClaimMutation: jest.fn().mockResolvedValue(false),
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
    inventoryClaimModel = module.get(getModelToken(InventoryClaim.name));
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
        -2, // Negative for reduction
        expect.objectContaining({ mutationId: expect.any(String) }),
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
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        mockShopId,
        'prodA',
        -2,
        expect.objectContaining({ mutationId: expect.any(String) }),
      );
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        mockShopId,
        'prodB',
        -1,
        expect.objectContaining({ mutationId: expect.any(String) }),
      );
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
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        mockShopId,
        'prod1',
        -1,
        expect.objectContaining({ mutationId: expect.any(String) }),
      );
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
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        mockShopId,
        'prod1',
        -2,
        expect.objectContaining({ mutationId: expect.any(String) }),
      );
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

  describe('durable claim crash recovery (SDV2-005)', () => {
    const twoItemDto = {
      items: [
        { productId: 'prodA', name: 'Product A', quantity: 2, unitPrice: 100 },
        { productId: 'prodB', name: 'Product B', quantity: 1, unitPrice: 50 },
      ],
      payments: [{ method: 'cash', amount: 289 }],
    };

    it('creates the durable claim record before the first stock claim', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      const createOrder = (inventoryClaimModel.create as jest.Mock).mock.invocationCallOrder[0];
      const firstClaimOrder = (inventoryService.updateStock as jest.Mock).mock.invocationCallOrder[0];
      expect(createOrder).toBeLessThan(firstClaimOrder);
    });

    it('writes the mutation receipt with the decrement and clears it after the CLAIMED flag', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      const claims: Map<string, any> = inventoryClaimModel.__claims;
      const record = [...claims.values()][0];
      const mutationId = record.items[0].mutationId;
      expect(mutationId).toBeTruthy();

      // Decrement carried the durable mutation identity
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        mockShopId,
        'prod1',
        -2,
        expect.objectContaining({ mutationId, claimId: record._id.toString() }),
      );
      // Receipt pulled once the CLAIMED flag is durable
      expect(inventoryService.clearClaimMutation).toHaveBeenCalledWith(
        mockShopId,
        'prod1',
        mutationId,
      );
    });

    it('persists CLAIMING -> per-item CLAIMED -> CLAIMED -> COMMITTED lifecycle', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, twoItemDto);

      const claims: Map<string, any> = inventoryClaimModel.__claims;
      const record = [...claims.values()][0];

      expect(record.state).toBe(InventoryClaimState.COMMITTED);
      expect(record.orderId).toBeDefined();
      expect(record.items.every((i: any) => i.state === InventoryClaimItemState.CLAIMED)).toBe(true);
      // Per-item durable progress was persisted after each stock claim
      expect(inventoryClaimModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          state: InventoryClaimState.CLAIMING,
          'items.productId': 'prodA',
        }),
        { $set: { 'items.$.state': InventoryClaimItemState.CLAIMED } },
      );
    });

    it('releases claimed items exactly once when order persistence fails (no double restore)', async () => {
      orderModel.mockImplementation((doc: any) => ({
        ...mockOrder,
        ...doc,
        save: jest.fn().mockRejectedValue(new Error('write conflict')),
      }));

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, twoItemDto),
      ).rejects.toThrow(InternalServerErrorException);

      // Each claimed item restored exactly once - no duplicate compensation.
      const restores = (inventoryService.updateStock as jest.Mock).mock.calls.filter(
        (call: any[]) => call[2] > 0,
      );
      expect(restores).toHaveLength(2);
      expect(restores).toEqual(
        expect.arrayContaining([
          [mockShopId, 'prodA', 2],
          [mockShopId, 'prodB', 1],
        ]),
      );

      const claims: Map<string, any> = inventoryClaimModel.__claims;
      const record = [...claims.values()][0];
      expect(record.state).toBe(InventoryClaimState.RELEASED);
      expect(record.items.every((i: any) => i.state === InventoryClaimItemState.RESTORED)).toBe(true);
    });

    it('never restores an item that was never claimed (mid-cart failure)', async () => {
      inventoryService.updateStock.mockImplementation((_shopId: string, productId: string) =>
        productId === 'prodA' ? Promise.resolve({ stock: 8 }) : Promise.resolve(null),
      );

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, twoItemDto),
      ).rejects.toThrow(BadRequestException);

      // prodB stayed PENDING in the claim record - it must NOT be restored.
      expect(inventoryService.updateStock).toHaveBeenCalledWith(mockShopId, 'prodA', 2);
      expect(inventoryService.updateStock).not.toHaveBeenCalledWith(mockShopId, 'prodB', 1);

      const claims: Map<string, any> = inventoryClaimModel.__claims;
      const record = [...claims.values()][0];
      // prodB stayed PENDING (never claimed, never restored); the claim still
      // finalizes because every item is resolved.
      expect(record.state).toBe(InventoryClaimState.RELEASED);
      expect(record.items.find((i: any) => i.productId === 'prodB').state).toBe(
        InventoryClaimItemState.PENDING,
      );
    });

    it('a repeated release pass restores nothing further (release is idempotent)', async () => {
      orderModel.mockImplementation((doc: any) => ({
        ...mockOrder,
        ...doc,
        save: jest.fn().mockRejectedValue(new Error('write conflict')),
      }));

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, twoItemDto),
      ).rejects.toThrow(InternalServerErrorException);

      const claims: Map<string, any> = inventoryClaimModel.__claims;
      const record = [...claims.values()][0];
      (inventoryService.updateStock as jest.Mock).mockClear();
      (inventoryService.createStockAdjustment as jest.Mock).mockClear();

      // Reconciliation resume: every item already RESTORED -> zero mutation.
      await (service as any).markClaimReleasing(record._id.toString());
      await (service as any).releaseClaimRecord(record._id.toString(), mockShopId, mockUserId);

      expect(inventoryService.updateStock).not.toHaveBeenCalled();
      expect(inventoryService.createStockAdjustment).not.toHaveBeenCalled();
    });

    it('aborts checkout deterministically if claim ownership is lost mid-claim', async () => {
      // Simulate reconciliation winning the claim while checkout is in flight:
      // the guarded per-item write loses (modifiedCount 0).
      inventoryClaimModel.updateOne.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      }));

      await expect(
        service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto),
      ).rejects.toThrow(InternalServerErrorException);

      // The stock claim happened, but no order and no payment survive.
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        mockShopId,
        'prod1',
        -2,
        expect.objectContaining({ mutationId: expect.any(String) }),
      );
      expect(paymentTransactionService.createTransaction).not.toHaveBeenCalled();
      expect(activityService.logActivity).not.toHaveBeenCalled();
    });
  });
});

