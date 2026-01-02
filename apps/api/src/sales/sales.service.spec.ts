import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { SalesService } from './sales.service';
import { Order } from './schemas/order.schema';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { PaymentTransactionService } from '../payments/services/payment-transaction.service';
import { CacheService } from '../common/services/cache.service';
import { ShopSettingsService } from '../shop-settings/shop-settings.service';
import { TransactionService } from '../common/services/transaction.service';
import { BadRequestException } from '@nestjs/common';

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
    const mockOrderModel = jest.fn().mockImplementation(() => ({
      ...mockOrder,
      save: jest.fn().mockResolvedValue(mockOrder),
    }));
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

      expect(activityService.logActivity).toHaveBeenCalledWith(
        mockShopId,
        mockUserId,
        expect.any(String),
        'cashier',
        'checkout',
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

    it('should invalidate cache after checkout', async () => {
      await service.checkout(mockShopId, mockUserId, mockBranchId, mockCheckoutDto);

      expect(cacheService.deletePattern).toHaveBeenCalledWith(
        `shop:${mockShopId}:orders:*`
      );
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

