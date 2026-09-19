import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InventoryService } from './inventory.service';
import { Product } from './schemas/product.schema';
import { Category } from './schemas/category.schema';
import { StockAdjustment } from './schemas/stock-adjustment.schema';
import { StockReconciliation } from './schemas/stock-reconciliation.schema';
import { Order } from '../sales/schemas/order.schema';
import { CategorySuggestionService } from './services/category-suggestion.service';
import { SubscriptionGuardService } from '../subscriptions/subscription-guard.service';
import { CacheService } from '../common/services/cache.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('InventoryService', () => {
  let service: InventoryService;
  let productModel: any;
  let categoryModel: any;
  let stockAdjustmentModel: any;
  let subscriptionGuard: any;
  let cacheService: any;

  const mockShopId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockProductId = '507f1f77bcf86cd799439013';

  const mockProduct = {
    _id: new Types.ObjectId(mockProductId),
    shopId: new Types.ObjectId(mockShopId),
    name: 'Test Product',
    sku: 'TEST-001',
    barcode: '1234567890123',
    price: 100,
    cost: 50,
    stock: 50,
    status: 'active',
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    // Create mock product model (constructible: service uses `new this.productModel()`)
    const mockProductModel: any = jest.fn().mockImplementation(() => ({
      ...mockProduct,
      save: jest.fn().mockResolvedValue(mockProduct),
    }));
    mockProductModel.find = jest.fn().mockReturnThis();
    mockProductModel.findOne = jest.fn().mockReturnThis();
    mockProductModel.findById = jest.fn().mockReturnThis();
    mockProductModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);
    mockProductModel.findOneAndUpdate = jest.fn().mockReturnThis();
    mockProductModel.countDocuments = jest.fn().mockResolvedValue(10);
    mockProductModel.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    mockProductModel.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    mockProductModel.sort = jest.fn().mockReturnThis();
    mockProductModel.skip = jest.fn().mockReturnThis();
    mockProductModel.limit = jest.fn().mockReturnThis();
    mockProductModel.lean = jest.fn().mockReturnThis();
    mockProductModel.exec = jest.fn().mockResolvedValue([mockProduct]);
    mockProductModel.create = jest.fn().mockResolvedValue(mockProduct);

    const mockCategoryModel = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ _id: 'cat1', name: 'Test Category' }),
    };

    const mockStockAdjustmentModel: any = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({}),
    }));
    mockStockAdjustmentModel.create = jest.fn().mockResolvedValue({});
    mockStockAdjustmentModel.find = jest.fn().mockReturnThis();
    mockStockAdjustmentModel.sort = jest.fn().mockReturnThis();
    mockStockAdjustmentModel.limit = jest.fn().mockReturnThis();
    mockStockAdjustmentModel.exec = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(StockAdjustment.name),
          useValue: mockStockAdjustmentModel,
        },
        {
          provide: getModelToken(StockReconciliation.name),
          useValue: {
            find: jest.fn().mockReturnThis(),
            create: jest.fn().mockResolvedValue({}),
            exec: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getModelToken(Order.name),
          useValue: {
            find: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: CategorySuggestionService,
          useValue: {
            suggestCategory: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: SubscriptionGuardService,
          useValue: {
            enforceLimit: jest.fn().mockResolvedValue(undefined),
            incrementUsage: jest.fn().mockResolvedValue(undefined),
            decrementUsage: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CacheService,
          useValue: {
            getOrSet: jest.fn().mockImplementation((key, factory) => factory()),
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    productModel = module.get(getModelToken(Product.name));
    categoryModel = module.get(getModelToken(Category.name));
    stockAdjustmentModel = module.get(getModelToken(StockAdjustment.name));
    subscriptionGuard = module.get(SubscriptionGuardService);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    const createProductDto = {
      name: 'New Product',
      price: 150,
      stock: 100,
    };

    it('should enforce subscription limits before creating', async () => {
      productModel.create.mockResolvedValue(mockProduct);

      await service.createProduct(mockShopId, createProductDto);

      expect(subscriptionGuard.enforceLimit).toHaveBeenCalledWith(mockShopId, 'products');
    });

    it('should increment usage after creating product', async () => {
      productModel.create.mockResolvedValue(mockProduct);

      await service.createProduct(mockShopId, createProductDto);

      expect(subscriptionGuard.incrementUsage).toHaveBeenCalledWith(mockShopId, 'products');
    });
  });

  describe('deleteProduct (soft delete)', () => {
    it('should soft delete product by setting deletedAt', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.deleteProduct(mockShopId, mockProductId, mockUserId);

      expect(productModel.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Types.ObjectId) },
        expect.objectContaining({
          $set: expect.objectContaining({
            deletedAt: expect.any(Date),
            status: 'inactive',
          }),
        })
      );
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productModel.findOne.mockResolvedValue(null);

      await expect(
        service.deleteProduct(mockShopId, mockProductId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should decrement usage after soft delete', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      await service.deleteProduct(mockShopId, mockProductId);

      expect(subscriptionGuard.decrementUsage).toHaveBeenCalledWith(mockShopId, 'products');
    });
  });

  describe('restoreProduct', () => {
    it('should restore soft-deleted product', async () => {
      const deletedProduct = { ...mockProduct, deletedAt: new Date() };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedProduct),
      });

      const result = await service.restoreProduct(mockShopId, mockProductId);

      expect(productModel.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Types.ObjectId) },
        expect.objectContaining({
          $unset: { deletedAt: 1, deletedBy: 1 },
          $set: { status: 'active' },
        })
      );
      expect(result.restored).toBe(true);
    });

    it('should enforce subscription limit before restoring', async () => {
      const deletedProduct = { ...mockProduct, deletedAt: new Date() };
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedProduct),
      });

      await service.restoreProduct(mockShopId, mockProductId);

      expect(subscriptionGuard.enforceLimit).toHaveBeenCalledWith(mockShopId, 'products');
    });
  });

  describe('updateStock', () => {
    it('should update stock with positive quantity', async () => {
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, stock: 60 }),
      });

      const result = await service.updateStock(mockShopId, mockProductId, 10);

      expect(result.stock).toBe(60);
    });

    it('should update stock with negative quantity (reduction)', async () => {
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, stock: 40 }),
      });

      const result = await service.updateStock(mockShopId, mockProductId, -10);

      expect(result.stock).toBe(40);
    });

    it('bounds reduction atomically in the update filter so concurrent checkouts cannot oversell', async () => {
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProduct, stock: 40 }),
      });

      await service.updateStock(mockShopId, mockProductId, -10);

      expect(productModel.findOne).not.toHaveBeenCalled();
      expect(productModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(Types.ObjectId),
          shopId: expect.any(Types.ObjectId),
          stock: { $gte: 10 },
        },
        { $inc: { stock: -10 } },
        { new: true },
      );
    });

    it('returns null instead of clamping when stock is insufficient (no silent stock loss)', async () => {
      productModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.updateStock(mockShopId, mockProductId, -10);

      expect(result).toBeNull();
      // The guard must live in the atomic update filter, not a read-check-write
      expect(productModel.findOne).not.toHaveBeenCalled();
      const [filter] = productModel.findOneAndUpdate.mock.calls[0];
      expect(filter.stock).toEqual({ $gte: 10 });
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.findByBarcode(mockShopId, '1234567890123');

      expect(productModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          barcode: '1234567890123',
        })
      );
      expect(result).toBeDefined();
    });

    it('should return null for non-existent barcode', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByBarcode(mockShopId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findBySku', () => {
    it('should find product by SKU', async () => {
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await service.findBySku(mockShopId, 'TEST-001');

      expect(productModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: { $regex: '^TEST-001$', $options: 'i' },
        })
      );
      expect(result).toBeDefined();
    });
  });

  describe('listProducts', () => {
    it('should exclude soft-deleted products by default', async () => {
      productModel.exec.mockResolvedValue([mockProduct]);

      await service.listProducts(mockShopId, {});

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: { $exists: false },
        })
      );
    });

    it('should filter by status', async () => {
      productModel.exec.mockResolvedValue([mockProduct]);

      await service.listProducts(mockShopId, { status: 'active' });

      expect(productModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should search by name', async () => {
      productModel.exec.mockResolvedValue([mockProduct]);

      await service.listProducts(mockShopId, { q: 'Test' });

      expect(productModel.find).toHaveBeenCalled();
    });
  });

  describe('createStockAdjustment', () => {
    it('should create stock adjustment record', async () => {
      await service.createStockAdjustment(
        mockShopId,
        mockProductId,
        -5,
        'sale',
        mockUserId,
        'Test adjustment'
      );

      expect(stockAdjustmentModel).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: expect.any(Types.ObjectId),
          productId: expect.any(Types.ObjectId),
          quantityChange: -5,
          reason: 'sale',
        })
      );
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products below threshold', async () => {
      const lowStockProduct = { ...mockProduct, stock: 5, lowStockThreshold: 10 };
      productModel.exec.mockResolvedValue([lowStockProduct]);

      const result = await service.getLowStockProducts(mockShopId, 10);

      expect(result).toHaveLength(1);
    });
  });
});

