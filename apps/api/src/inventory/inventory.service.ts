import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Category, CategoryDocument } from './schemas/category.schema';
import { StockAdjustment, StockAdjustmentDocument } from './schemas/stock-adjustment.schema';
import { StockReconciliation, StockReconciliationDocument } from './schemas/stock-reconciliation.schema';
import { CreateProductDto, BulkImportOptionsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategorySuggestionService } from './services/category-suggestion.service';
import { SubscriptionGuardService } from '../subscriptions/subscription-guard.service';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/pagination.dto';
import { CacheService, CACHE_TTL } from '../common/services/cache.service';

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(StockAdjustment.name) private readonly adjustmentModel: Model<StockAdjustmentDocument>,
    @InjectModel(StockReconciliation.name) private readonly reconciliationModel: Model<StockReconciliationDocument>,
    private readonly categorySuggestionService: CategorySuggestionService,
    @Inject(forwardRef(() => SubscriptionGuardService))
    private readonly subscriptionGuard: SubscriptionGuardService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Drop legacy global unique indexes on startup (one-time migration)
   */
  async onModuleInit() {
    try {
      const collection = this.productModel.collection;
      const indexes = await collection.indexes();
      
      // Check for old global unique indexes and drop them
      for (const index of indexes) {
        if (index.name === 'sku_1' || index.name === 'barcode_1') {
          this.logger.log(`Dropping legacy index: ${index.name}`);
          await collection.dropIndex(index.name);
        }
      }
    } catch (err: any) {
      // Ignore errors if indexes don't exist
      if (!err.message?.includes('index not found')) {
        this.logger.warn(`Index migration warning: ${err.message}`);
      }
    }

    // Fix any existing negative stock (one-time cleanup, runs async)
    setImmediate(() => {
      this.fixNegativeStock().catch(err => {
        this.logger.error('Failed to fix negative stock:', err);
      });
    });
  }

  /**
   * Fix all products with negative stock by setting them to 0
   * This is a one-time cleanup for data integrity
   */
  async fixNegativeStock(): Promise<{ fixed: number }> {
    try {
      const result = await this.productModel.updateMany(
        { stock: { $lt: 0 } },
        { $set: { stock: 0 } }
      );
      
      if (result.modifiedCount > 0) {
        this.logger.warn(`Fixed ${result.modifiedCount} products with negative stock (set to 0)`);
      }
      
      return { fixed: result.modifiedCount };
    } catch (error) {
      this.logger.error('Error fixing negative stock:', error);
      throw error;
    }
  }

  async createProduct(shopId: string, dto: CreateProductDto): Promise<ProductDocument> {
    // Enforce product limit
    await this.subscriptionGuard.enforceLimit(shopId, 'products');

    const created = new this.productModel({
      shopId: new Types.ObjectId(shopId),
      name: dto.name,
      sku: dto.sku,
      barcode: dto.barcode,
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
      price: dto.price,
      cost: dto.cost ?? 0,
      stock: dto.stock ?? 0,
      tax: dto.tax ?? 0,
      status: dto.status ?? 'active',
    });
    const product = await created.save();

    // Update usage count
    await this.subscriptionGuard.incrementUsage(shopId, 'products');

    return product;
  }

  async getProductById(shopId: string, productId: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({
        _id: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
  }

  async updateProduct(shopId: string, productId: string, dto: UpdateProductDto): Promise<ProductDocument | null> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Update fields if provided
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.sku !== undefined) product.sku = dto.sku;
    if (dto.barcode !== undefined) product.barcode = dto.barcode;
    if (dto.categoryId !== undefined) {
      product.categoryId = dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined;
    }
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.cost !== undefined) product.cost = dto.cost;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.tax !== undefined) product.tax = dto.tax;
    if (dto.status !== undefined) product.status = dto.status;
    if (dto.lowStockThreshold !== undefined) product.lowStockThreshold = dto.lowStockThreshold;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.image !== undefined) product.image = dto.image;

    product.updatedAt = new Date();
    return product.save();
  }

  /**
   * Soft delete a product (sets deletedAt timestamp instead of removing)
   * Product can be restored later if needed
   */
  async deleteProduct(shopId: string, productId: string, userId?: string): Promise<{ deleted: boolean; message: string }> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
      deletedAt: { $exists: false }, // Only find non-deleted products
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft delete: set deletedAt timestamp and deletedBy user
    await this.productModel.updateOne(
      { _id: new Types.ObjectId(productId) },
      { 
        $set: { 
          deletedAt: new Date(),
          deletedBy: userId ? new Types.ObjectId(userId) : undefined,
          status: 'inactive', // Also mark as inactive
        } 
      }
    );
    
    // Decrement product count
    await this.subscriptionGuard.decrementUsage(shopId, 'products');

    return { deleted: true, message: 'Product deleted successfully' };
  }

  /**
   * Restore a soft-deleted product
   */
  async restoreProduct(shopId: string, productId: string): Promise<{ restored: boolean; message: string }> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
      deletedAt: { $exists: true },
    });

    if (!product) {
      throw new NotFoundException('Deleted product not found');
    }

    // Check subscription limit before restoring
    await this.subscriptionGuard.enforceLimit(shopId, 'products');

    await this.productModel.updateOne(
      { _id: new Types.ObjectId(productId) },
      { $unset: { deletedAt: 1, deletedBy: 1 }, $set: { status: 'active' } }
    );

    // Increment product count
    await this.subscriptionGuard.incrementUsage(shopId, 'products');

    return { restored: true, message: 'Product restored successfully' };
  }

  /**
   * Permanently delete a product (hard delete)
   * Use with caution - this cannot be undone
   */
  async permanentlyDeleteProduct(shopId: string, productId: string): Promise<{ deleted: boolean; message: string }> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productModel.deleteOne({ _id: new Types.ObjectId(productId) });
    
    // Only decrement if product wasn't already soft-deleted
    if (!product.deletedAt) {
      await this.subscriptionGuard.decrementUsage(shopId, 'products');
    }

    return { deleted: true, message: 'Product permanently deleted' };
  }

  async listProducts(shopId: string, q: QueryProductsDto): Promise<ProductDocument[]> {
    const filter: FilterQuery<ProductDocument> = {
      shopId: new Types.ObjectId(shopId),
      deletedAt: { $exists: false }, // Exclude soft-deleted products by default
    };
    
    if (q.q) {
      const searchTerm = q.q.trim();
      
      // Check if search term looks like a barcode (numeric, 8-14 digits)
      const isBarcodeLike = /^\d{8,14}$/.test(searchTerm);
      
      // Check if search term looks like a SKU (alphanumeric, typically shorter)
      const isSkuLike = /^[A-Za-z0-9-_]{3,20}$/.test(searchTerm) && !isBarcodeLike;
      
      if (isBarcodeLike) {
        // Prioritize exact barcode match for barcode-like searches
        filter.$or = [
          { barcode: searchTerm },
          { sku: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } },
        ];
      } else if (isSkuLike && searchTerm.length <= 20) {
        // Search SKU, barcode, and name for SKU-like searches
        filter.$or = [
          { sku: { $regex: `^${searchTerm}`, $options: 'i' } }, // SKU starts with
          { barcode: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } },
        ];
      } else {
        // General text search - search name, SKU, barcode, and description
        filter.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { sku: { $regex: searchTerm, $options: 'i' } },
          { barcode: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ];
      }
    }
    
    if (q.categoryId) {
      filter.categoryId = new Types.ObjectId(q.categoryId);
    }
    // Only filter by status if explicitly provided, otherwise show all products
    if (q.status) {
      filter.status = q.status;
    }

    // For branch-specific inventory: filter products that have stock in the branch
    // If branchId is provided, only show products with branchInventory for that branch
    if (q.branchId) {
      const branchKey = `branchInventory.${q.branchId}`;
      filter[branchKey] = { $exists: true };
    }

    const products = await this.productModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(Math.min(q.limit ?? 50, 200))
      .exec();

    // If branchId provided, transform stock to show branch-specific stock
    if (q.branchId) {
      const branchId = q.branchId; // Capture for type narrowing
      return products.map(product => {
        const doc = product.toObject() as any;
        const branchStock = product.branchInventory?.[branchId]?.stock ?? 0;
        doc.stock = branchStock;
        doc._branchStock = branchStock; // Additional field for clarity
        return doc as ProductDocument;
      });
    }

    return products;
  }

  /**
   * List products with pagination support
   * More efficient for large product catalogs
   */
  async listProductsPaginated(
    shopId: string,
    q: QueryProductsDto,
  ): Promise<PaginatedResponse<ProductDocument>> {
    const filter: FilterQuery<ProductDocument> = {
      shopId: new Types.ObjectId(shopId),
      deletedAt: { $exists: false }, // Exclude soft-deleted products by default
    };

    if (q.q) {
      const searchTerm = q.q.trim();
      const isBarcodeLike = /^\d{8,14}$/.test(searchTerm);
      const isSkuLike = /^[A-Za-z0-9-_]{3,20}$/.test(searchTerm) && !isBarcodeLike;

      if (isBarcodeLike) {
        filter.$or = [
          { barcode: searchTerm },
          { sku: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } },
        ];
      } else if (isSkuLike && searchTerm.length <= 20) {
        filter.$or = [
          { sku: { $regex: `^${searchTerm}`, $options: 'i' } },
          { barcode: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } },
        ];
      } else {
        filter.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { sku: { $regex: searchTerm, $options: 'i' } },
          { barcode: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ];
      }
    }

    if (q.categoryId) {
      filter.categoryId = new Types.ObjectId(q.categoryId);
    }
    if (q.status) {
      filter.status = q.status;
    }

    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    // Build sort object
    const sortField = q.sortBy || 'updatedAt';
    const sortOrder = q.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  /**
   * Get product count for a shop (cached)
   */
  async getProductCount(shopId: string): Promise<number> {
    const cacheKey = CacheService.shopKey(shopId, 'products', 'count');
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.productModel.countDocuments({ shopId: new Types.ObjectId(shopId) }),
      CACHE_TTL.STATS,
    );
  }

  /**
   * Find product by exact barcode match
   * Used for barcode scanner - returns single product or null
   * Also checks SKU as fallback for backwards compatibility
   */
  async findByBarcode(shopId: string, barcode: string): Promise<ProductDocument | null> {
    const trimmedBarcode = barcode.trim();
    const shopObjId = new Types.ObjectId(shopId);
    
    // Try exact barcode match first
    let product = await this.productModel.findOne({
      shopId: shopObjId,
      barcode: trimmedBarcode,
      status: 'active',
      deletedAt: { $exists: false },
    }).exec();
    
    // If not found, try with leading zeros removed (some scanners add/remove leading zeros)
    if (!product && trimmedBarcode.startsWith('0')) {
      product = await this.productModel.findOne({
        shopId: shopObjId,
        barcode: trimmedBarcode.replace(/^0+/, ''),
        status: 'active',
        deletedAt: { $exists: false },
      }).exec();
    }
    
    // If still not found, try adding leading zero (EAN-13 vs UPC-A conversion)
    if (!product && trimmedBarcode.length === 12) {
      product = await this.productModel.findOne({
        shopId: shopObjId,
        barcode: '0' + trimmedBarcode,
        status: 'active',
        deletedAt: { $exists: false },
      }).exec();
    }
    
    // FALLBACK: Check SKU field for backwards compatibility
    // (products created before barcode/SKU separation)
    if (!product) {
      product = await this.productModel.findOne({
        shopId: shopObjId,
        sku: trimmedBarcode,
        status: 'active',
        deletedAt: { $exists: false },
      }).exec();
    }
    
    return product;
  }

  /**
   * Find product by SKU
   */
  async findBySku(shopId: string, sku: string): Promise<ProductDocument | null> {
    return this.productModel.findOne({
      shopId: new Types.ObjectId(shopId),
      sku: { $regex: `^${sku.trim()}$`, $options: 'i' }, // Case-insensitive exact match
      status: 'active',
    }).exec();
  }

  /**
   * Quick search for POS - optimized for speed
   * Searches barcode (exact), SKU (prefix), and name (contains)
   */
  async quickSearch(shopId: string, term: string, limit: number = 10): Promise<ProductDocument[]> {
    const searchTerm = term.trim();
    if (!searchTerm) return [];

    const shopObjectId = new Types.ObjectId(shopId);

    // First, try exact barcode match (fastest for scanner)
    const exactBarcode = await this.productModel.findOne({
      shopId: shopObjectId,
      barcode: searchTerm,
      status: 'active',
    }).exec();

    if (exactBarcode) {
      return [exactBarcode];
    }

    // Then try SKU prefix match
    const skuMatches = await this.productModel.find({
      shopId: shopObjectId,
      sku: { $regex: `^${searchTerm}`, $options: 'i' },
      status: 'active',
    }).limit(limit).exec();

    if (skuMatches.length > 0) {
      return skuMatches;
    }

    // Finally, search by name
    return this.productModel.find({
      shopId: shopObjectId,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { barcode: { $regex: searchTerm, $options: 'i' } },
      ],
      status: 'active',
    }).limit(limit).exec();
  }

  async listCategories(shopId: string): Promise<any[]> {
    const shopObjId = new Types.ObjectId(shopId);
    
    const categories = await this.categoryModel
      .find({ shopId: shopObjId })
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();

    // Get accurate product counts using aggregation (excludes soft-deleted products)
    const productCounts = await this.productModel.aggregate([
      { 
        $match: { 
          shopId: shopObjId,
          deletedAt: { $exists: false },
          status: 'active',
        } 
      },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    // Get total product count for the shop
    const totalProducts = await this.productModel.countDocuments({
      shopId: shopObjId,
      deletedAt: { $exists: false },
      status: 'active',
    });

    // Create a map for quick lookup
    const countMap = new Map<string, number>();
    let categorizedCount = 0;
    let uncategorizedCount = 0;
    
    productCounts.forEach((pc) => {
      if (pc._id) {
        countMap.set(pc._id.toString(), pc.count);
        categorizedCount += pc.count;
      } else {
        // Products without categoryId (null or undefined)
        uncategorizedCount = pc.count;
      }
    });

    // Merge counts into categories and add metadata
    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      productCount: countMap.get(cat._id.toString()) || 0,
    }));

    // Add metadata about uncategorized products
    return {
      categories: categoriesWithCounts,
      meta: {
        totalCategories: categories.length,
        rootCategories: categories.filter(c => !c.parentId).length,
        totalProducts,
        categorizedProducts: categorizedCount,
        uncategorizedProducts: uncategorizedCount,
      }
    } as any;
  }

  /**
   * Sync all category product counts for a shop
   * This fixes any stale productCount values in the database
   */
  async syncCategoryProductCounts(shopId: string): Promise<{ synced: number; updated: number }> {
    const shopObjId = new Types.ObjectId(shopId);
    
    // Get accurate counts using aggregation (excludes soft-deleted products)
    const productCounts = await this.productModel.aggregate([
      { 
        $match: { 
          shopId: shopObjId,
          deletedAt: { $exists: false },
        } 
      },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    // Create a map for quick lookup
    const countMap = new Map<string, number>();
    productCounts.forEach((pc) => {
      if (pc._id) {
        countMap.set(pc._id.toString(), pc.count);
      }
    });

    // Get all categories for this shop
    const categories = await this.categoryModel.find({ shopId: shopObjId });
    
    let updated = 0;
    for (const category of categories) {
      const actualCount = countMap.get(category._id.toString()) || 0;
      if (category.productCount !== actualCount) {
        category.productCount = actualCount;
        await category.save();
        updated++;
      }
    }

    this.logger.log(`Synced category counts for shop ${shopId}: ${categories.length} categories, ${updated} updated`);
    return { synced: categories.length, updated };
  }

  async createCategory(shopId: string, dto: CreateCategoryDto): Promise<CategoryDocument> {
    // Generate slug if not provided
    const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    // Check for duplicate slug within shop
    const existing = await this.categoryModel.findOne({
      shopId: new Types.ObjectId(shopId),
      slug,
    });

    if (existing) {
      throw new BadRequestException(`Category with slug "${slug}" already exists`);
    }

    const category = new this.categoryModel({
      shopId: new Types.ObjectId(shopId),
      name: dto.name,
      slug,
      description: dto.description,
      parentId: dto.parentId ? new Types.ObjectId(dto.parentId) : undefined,
      image: dto.image,
      order: dto.order ?? 0,
      status: dto.status ?? 'active',
      productCount: 0,
    });

    return category.save();
  }

  async updateCategory(shopId: string, categoryId: string, dto: UpdateCategoryDto): Promise<CategoryDocument | null> {
    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // If slug is being updated, check for duplicates
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryModel.findOne({
        shopId: new Types.ObjectId(shopId),
        slug: dto.slug,
        _id: { $ne: new Types.ObjectId(categoryId) },
      });

      if (existing) {
        throw new BadRequestException(`Category with slug "${dto.slug}" already exists`);
      }
    }

    // Update fields
    if (dto.name) category.name = dto.name;
    if (dto.slug) category.slug = dto.slug;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.parentId !== undefined) {
      category.parentId = dto.parentId ? new Types.ObjectId(dto.parentId) : undefined;
    }
    if (dto.image !== undefined) category.image = dto.image;
    if (dto.order !== undefined) category.order = dto.order;
    if (dto.status) category.status = dto.status;

    return category.save();
  }

  async deleteCategory(shopId: string, categoryId: string): Promise<void> {
    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Check if category has products
    const productCount = await this.productModel.countDocuments({
      categoryId: new Types.ObjectId(categoryId),
    });

    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${productCount} product(s). Remove products first or reassign them.`,
      );
    }

    // Check if category has subcategories
    const subCategoryCount = await this.categoryModel.countDocuments({
      parentId: new Types.ObjectId(categoryId),
    });

    if (subCategoryCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${subCategoryCount} subcategory(ies). Delete subcategories first.`,
      );
    }

    await this.categoryModel.deleteOne({ _id: new Types.ObjectId(categoryId) });
  }

  async getCategoryWithProducts(shopId: string, categoryId: string): Promise<any> {
    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const products = await this.productModel
      .find({
        categoryId: new Types.ObjectId(categoryId),
        shopId: new Types.ObjectId(shopId),
      })
      .select('_id name sku price stock status')
      .exec();

    return {
      ...category.toObject(),
      products,
      productCount: products.length,
    };
  }

  async getCategoryHierarchy(shopId: string): Promise<any[]> {
    const categories = await this.categoryModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ order: 1, name: 1 })
      .exec();

    // Build hierarchy
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map
    categories.forEach((cat) => {
      categoryMap.set(cat._id.toString(), {
        ...cat.toObject(),
        children: [],
      });
    });

    // Second pass: build tree
    categories.forEach((cat) => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId.toString());
        if (parent) {
          parent.children.push(categoryMap.get(cat._id.toString()));
        }
      } else {
        rootCategories.push(categoryMap.get(cat._id.toString()));
      }
    });

    return rootCategories;
  }

  async updateStock(shopId: string, productId: string, quantityChange: number): Promise<ProductDocument | null> {
    // For stock reduction, ensure we don't go below 0
    if (quantityChange < 0) {
      // First check current stock
      const product = await this.productModel.findOne({
        _id: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      }).exec();
      
      if (!product) {
        return null;
      }
      
      const currentStock = product.stock || 0;
      const newStock = currentStock + quantityChange; // quantityChange is negative
      
      // Prevent negative stock - set to 0 if would go negative
      if (newStock < 0) {
        this.logger.warn(
          `Stock reduction would result in negative stock for product ${productId}. ` +
          `Current: ${currentStock}, Requested change: ${quantityChange}. Setting to 0.`
        );
        return this.productModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(productId), shopId: new Types.ObjectId(shopId) },
            { $set: { stock: 0 } },
            { new: true }
          )
          .exec();
      }
    }
    
    return this.productModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(productId), shopId: new Types.ObjectId(shopId) },
        { $inc: { stock: quantityChange } },
        { new: true }
      )
      .exec();
  }

  async getLowStockProducts(shopId: string, defaultThreshold = 10): Promise<ProductDocument[]> {
    // Use MongoDB $expr to compare stock against each product's own lowStockThreshold
    // Falls back to defaultThreshold if product doesn't have lowStockThreshold set
    return this.productModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
        $expr: {
          $lte: [
            '$stock',
            { $ifNull: ['$lowStockThreshold', defaultThreshold] }
          ]
        }
      })
      .sort({ stock: 1 })
      .exec();
  }

  /**
   * Import products with automatic category creation and suggestion
   * 
   * OPTIMIZED FOR SPEED:
   * - Uses bulk operations (insertMany, bulkWrite) instead of individual saves
   * - Pre-fetches all existing products by SKU/barcode in one query
   * - Batches category product count updates
   * 
   * Options:
   * - autoCreateCategories: Create categories from category names in CSV (default: true)
   * - autoSuggestCategories: Suggest categories based on product names (default: true)
   * - updateExisting: Update products if SKU/barcode matches (default: false)
   * - skipDuplicates: Skip products with duplicate SKU/barcode (default: true)
   */
  async importProducts(
    shopId: string, 
    products: CreateProductDto[], 
    options: BulkImportOptionsDto = {}
  ): Promise<{ 
    imported: number; 
    updated: number;
    skipped: number;
    errors: string[];
    categoriesCreated: string[];
    categorySuggestions: { [productName: string]: string };
  }> {
    const startTime = Date.now();
    const {
      autoCreateCategories = true,
      autoSuggestCategories = true,
      updateExisting = false,
      skipDuplicates = true,
      targetCategoryId, // Import all products to this specific category
    } = options;

    const errors: string[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const categoriesCreated: string[] = [];
    const categorySuggestions: { [productName: string]: string } = {};
    const shopObjId = new Types.ObjectId(shopId);
    
    // If targetCategoryId is provided, validate it exists
    let targetCategory: Types.ObjectId | undefined;
    if (targetCategoryId) {
      try {
        const categoryExists = await this.categoryModel.findOne({
          _id: new Types.ObjectId(targetCategoryId),
          shopId: shopObjId,
        });
        if (categoryExists) {
          targetCategory = categoryExists._id;
          this.logger.log(`Importing all products to category: ${categoryExists.name}`);
        } else {
          errors.push(`Target category not found: ${targetCategoryId}`);
        }
      } catch (err) {
        errors.push(`Invalid target category ID: ${targetCategoryId}`);
      }
    }

    // Step 1: Build category name to ID mapping
    const categoryNameToId = new Map<string, Types.ObjectId>();
    const existingCategories = await this.categoryModel.find({ shopId: shopObjId }).lean().exec();
    
    existingCategories.forEach(cat => {
      categoryNameToId.set(cat.name.toLowerCase(), cat._id);
      if (cat.slug) categoryNameToId.set(cat.slug, cat._id);
    });

    // Step 2: Collect all unique category names and suggest categories
    const categoryNamesToCreate = new Set<string>();
    
    for (const product of products) {
      let categoryName = product.category;
      
      if (!categoryName && !product.categoryId && autoSuggestCategories) {
        const suggested = this.categorySuggestionService.suggestCategory(product.name, product.brand);
        if (suggested) {
          categoryName = suggested;
          categorySuggestions[product.name] = suggested;
        }
      }

      if (categoryName && autoCreateCategories) {
        const normalizedName = categoryName.toLowerCase();
        if (!categoryNameToId.has(normalizedName)) {
          categoryNamesToCreate.add(categoryName);
        }
      }
    }

    // Step 3: Bulk create missing categories
    if (categoryNamesToCreate.size > 0) {
      const categoriesToInsert = Array.from(categoryNamesToCreate).map(name => ({
        shopId: shopObjId,
        name,
        slug: this.generateSlug(name),
        status: 'active',
        productCount: 0,
      }));

      try {
        const insertedCategories = await this.categoryModel.insertMany(categoriesToInsert, { ordered: false });
        insertedCategories.forEach(cat => {
          categoryNameToId.set(cat.name.toLowerCase(), cat._id);
          categoryNameToId.set(cat.slug, cat._id);
          categoriesCreated.push(cat.name);
        });
        this.logger.log(`Bulk created ${insertedCategories.length} categories`);
      } catch (err: any) {
        // Handle duplicate key errors gracefully (some categories may already exist)
        if (err.writeErrors) {
          const successfulInserts = err.insertedDocs || [];
          successfulInserts.forEach((cat: any) => {
            categoryNameToId.set(cat.name.toLowerCase(), cat._id);
            categoriesCreated.push(cat.name);
          });
        }
        this.logger.warn(`Some categories failed to create: ${err.message}`);
      }
    }

    // Step 4: Pre-fetch all existing products by SKU/barcode in ONE query
    const skus = products.map(p => p.sku).filter(Boolean) as string[];
    const barcodes = products.map(p => p.barcode).filter(Boolean) as string[];
    
    const existingProductsMap = new Map<string, ProductDocument>();
    
    if (skus.length > 0 || barcodes.length > 0) {
      const existingProducts = await this.productModel.find({
        shopId: shopObjId,
        $or: [
          ...(skus.length > 0 ? [{ sku: { $in: skus } }] : []),
          ...(barcodes.length > 0 ? [{ barcode: { $in: barcodes } }] : []),
        ],
      }).lean().exec();

      existingProducts.forEach(p => {
        if (p.sku) existingProductsMap.set(`sku:${p.sku}`, p as any);
        if (p.barcode) existingProductsMap.set(`barcode:${p.barcode}`, p as any);
      });
    }

    // Step 5: Prepare bulk operations
    const productsToInsert: any[] = [];
    const updateOperations: any[] = [];
    const categoryProductCounts = new Map<string, number>();

    for (let i = 0; i < products.length; i++) {
      const dto = products[i];
      
      if (!dto.name || dto.price === undefined || dto.price === null) {
        errors.push(`Row ${i + 1}: Missing required fields (name, price)`);
        continue;
      }

      // Resolve category ID - use targetCategory if provided, otherwise resolve from CSV/suggestions
      let categoryId: Types.ObjectId | undefined = undefined;
      
      if (targetCategory) {
        // Use the target category for all products
        categoryId = targetCategory;
      } else if (dto.categoryId) {
        try {
          categoryId = new Types.ObjectId(dto.categoryId);
        } catch {
          // Invalid ObjectId, try as category name
          categoryId = categoryNameToId.get(dto.categoryId.toLowerCase());
        }
      } else if (dto.category) {
        categoryId = categoryNameToId.get(dto.category.toLowerCase());
      } else if (categorySuggestions[dto.name]) {
        categoryId = categoryNameToId.get(categorySuggestions[dto.name].toLowerCase());
      }

      // Check for existing product
      const existingBySku = dto.sku ? existingProductsMap.get(`sku:${dto.sku}`) : null;
      const existingByBarcode = dto.barcode ? existingProductsMap.get(`barcode:${dto.barcode}`) : null;
      const existingProduct = existingBySku || existingByBarcode;

      if (existingProduct) {
        if (updateExisting) {
          updateOperations.push({
            updateOne: {
              filter: { _id: existingProduct._id },
              update: {
                $set: {
                  name: dto.name,
                  price: dto.price,
                  cost: dto.cost ?? existingProduct.cost ?? 0,
                  stock: dto.stock ?? existingProduct.stock ?? 0,
                  tax: dto.tax ?? existingProduct.tax ?? 0,
                  categoryId: categoryId ?? existingProduct.categoryId,
                  status: dto.status ?? existingProduct.status ?? 'active',
                  description: dto.description ?? existingProduct.description,
                  brand: dto.brand ?? existingProduct.brand,
                  lowStockThreshold: dto.lowStockThreshold ?? existingProduct.lowStockThreshold ?? 10,
                  reorderPoint: dto.reorderPoint ?? existingProduct.reorderPoint ?? 0,
                  updatedAt: new Date(),
                },
              },
            },
          });
          updated++;
        } else if (skipDuplicates) {
          skipped++;
        } else {
          errors.push(`Row ${i + 1}: Product with SKU/barcode already exists`);
        }
        continue;
      }

      // Prepare new product for bulk insert
      productsToInsert.push({
        shopId: shopObjId,
        name: dto.name,
        sku: dto.sku || undefined,
        barcode: dto.barcode || undefined,
        categoryId,
        price: dto.price,
        cost: dto.cost ?? 0,
        stock: dto.stock ?? 0,
        tax: dto.tax ?? 0,
        status: dto.status ?? 'active',
        description: dto.description,
        brand: dto.brand,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
        reorderPoint: dto.reorderPoint ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Track category product counts
      if (categoryId) {
        const catIdStr = categoryId.toString();
        categoryProductCounts.set(catIdStr, (categoryProductCounts.get(catIdStr) || 0) + 1);
      }
    }

    // Step 6: Execute bulk insert
    if (productsToInsert.length > 0) {
      try {
        const result = await this.productModel.insertMany(productsToInsert, { ordered: false });
        imported = result.length;
      } catch (err: any) {
        // Handle partial failures
        if (err.insertedDocs) {
          imported = err.insertedDocs.length;
        }
        if (err.writeErrors) {
          err.writeErrors.forEach((writeErr: any) => {
            const idx = writeErr.index;
            const productName = productsToInsert[idx]?.name || 'Unknown';
            let errorMsg = writeErr.errmsg || 'Failed to insert';
            
            // Make duplicate key errors more user-friendly
            if (errorMsg.includes('duplicate key') || errorMsg.includes('E11000')) {
              if (errorMsg.includes('sku')) {
                errorMsg = `Duplicate SKU "${productsToInsert[idx]?.sku}"`;
              } else if (errorMsg.includes('barcode')) {
                errorMsg = `Duplicate barcode "${productsToInsert[idx]?.barcode}"`;
              } else {
                errorMsg = 'Duplicate product';
              }
            }
            
            errors.push(`Row ${idx + 1} (${productName}): ${errorMsg}`);
          });
        }
      }
    }

    // Step 7: Execute bulk updates
    if (updateOperations.length > 0) {
      try {
        await this.productModel.bulkWrite(updateOperations, { ordered: false });
      } catch (err: any) {
        this.logger.warn(`Some updates failed: ${err.message}`);
      }
    }

    // Step 8: Bulk update category product counts
    if (categoryProductCounts.size > 0) {
      const categoryUpdateOps = Array.from(categoryProductCounts.entries()).map(([catId, count]) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(catId) },
          update: { $inc: { productCount: count } },
        },
      }));

      try {
        await this.categoryModel.bulkWrite(categoryUpdateOps, { ordered: false });
      } catch (err: any) {
        this.logger.warn(`Failed to update category counts: ${err.message}`);
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Import complete in ${duration}ms: ${imported} imported, ${updated} updated, ` +
      `${skipped} skipped, ${categoriesCreated.length} categories created`
    );

    return { 
      imported, 
      updated,
      skipped,
      errors, 
      categoriesCreated,
      categorySuggestions,
    };
  }

  /**
   * Analyze products before import to show what categories will be created/suggested
   */
  async analyzeImport(shopId: string, products: CreateProductDto[]): Promise<{
    total: number;
    withCategory: number;
    withSuggestion: number;
    uncategorized: number;
    existingCategories: string[];
    newCategories: string[];
    suggestedCategories: { [category: string]: number };
    duplicates: number;
  }> {
    // Get existing categories
    const existingCategories = await this.categoryModel.find({ 
      shopId: new Types.ObjectId(shopId) 
    }).exec();
    const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()));

    // Analyze products
    const analysis = this.categorySuggestionService.analyzeProducts(products);
    
    // Determine which categories are new vs existing
    const newCategories: string[] = [];
    const existingCategoriesUsed: string[] = [];
    
    Object.keys(analysis.suggestedCategories).forEach(category => {
      if (existingCategoryNames.has(category.toLowerCase())) {
        existingCategoriesUsed.push(category);
      } else {
        newCategories.push(category);
      }
    });

    // Check for duplicates
    let duplicates = 0;
    for (const product of products) {
      if (product.sku || product.barcode) {
        const existing = await this.productModel.findOne({
          shopId: new Types.ObjectId(shopId),
          $or: [
            ...(product.sku ? [{ sku: product.sku }] : []),
            ...(product.barcode ? [{ barcode: product.barcode }] : []),
          ],
        }).exec();
        if (existing) duplicates++;
      }
    }

    return {
      total: analysis.total,
      withCategory: analysis.withCategory,
      withSuggestion: analysis.withSuggestion,
      uncategorized: analysis.uncategorized,
      existingCategories: existingCategoriesUsed,
      newCategories,
      suggestedCategories: analysis.suggestedCategories,
      duplicates,
    };
  }

  /**
   * Generate a URL-friendly slug from a category name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async exportProducts(shopId: string, res: any, categoryId?: string): Promise<void> {
    try {
      const filter: any = { shopId: new Types.ObjectId(shopId) };
      if (categoryId && categoryId !== 'undefined' && categoryId !== 'null') {
        filter.categoryId = new Types.ObjectId(categoryId);
      }
      
      const products = await this.productModel.find(filter).exec();
      
      // Get categories for name lookup
      const categories = await this.categoryModel
        .find({ shopId: new Types.ObjectId(shopId) })
        .select('_id name')
        .exec();
      const categoryMap = new Map(categories.map(c => [c._id.toString(), c.name]));
      
      const headers = ['name', 'sku', 'barcode', 'price', 'cost', 'stock', 'category', 'tax', 'status', 'description'];
      const rows = products.map((product) => [
        product.name || '',
        product.sku || '',
        product.barcode || '',
        product.price ?? 0,
        product.cost ?? 0,
        product.stock ?? 0,
        (product.categoryId ? categoryMap.get(product.categoryId.toString()) : '') || '',
        product.tax ?? 0,
        product.status || 'active',
        product.description || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const str = String(cell ?? '');
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(','),
        ),
      ].join('\n');

      // Add BOM for Excel UTF-8 compatibility
      const csvWithBOM = '\ufeff' + csvContent;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=products-export-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvWithBOM);
    } catch (error) {
      console.error('Export products service error:', error);
      throw error;
    }
  }

  async createStockAdjustment(
    shopId: string,
    productId: string,
    quantityChange: number,
    reason: string,
    adjustedBy: string,
    notes?: string,
  ): Promise<StockAdjustmentDocument> {
    const adjustment = new this.adjustmentModel({
      shopId: new Types.ObjectId(shopId),
      productId: new Types.ObjectId(productId),
      quantityChange,
      reason,
      adjustedBy: new Types.ObjectId(adjustedBy),
      notes,
    });

    // Update product stock
    await this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantityChange } },
      { new: true },
    );

    return adjustment.save();
  }

  async getStockAdjustmentHistory(
    shopId: string,
    filters?: {
      productId?: string;
      reason?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<StockAdjustmentDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.productId) {
      query.productId = new Types.ObjectId(filters.productId);
    }

    if (filters?.reason) {
      query.reason = filters.reason;
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    return this.adjustmentModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getExpiringProducts(shopId: string, daysUntilExpiry = 30): Promise<ProductDocument[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return this.productModel
      .find({
        shopId: new Types.ObjectId(shopId),
        expiryDate: {
          $lte: expiryDate,
          $gte: new Date(),
        },
        status: 'active',
      })
      .sort({ expiryDate: 1 })
      .exec();
  }

  async createStockReconciliation(
    shopId: string,
    productId: string,
    physicalCount: number,
    reconciliationDate: Date,
    reconcililedBy: string,
    notes?: string,
  ): Promise<StockReconciliationDocument> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const systemQuantity = product.stock || 0;
    const variance = physicalCount - systemQuantity;

    const reconciliation = new this.reconciliationModel({
      shopId: new Types.ObjectId(shopId),
      productId: new Types.ObjectId(productId),
      systemQuantity,
      physicalCount,
      variance,
      reconciliationDate,
      reconcililedBy: new Types.ObjectId(reconcililedBy),
      notes,
    });

    // If variance exists, create adjustment
    if (variance !== 0) {
      await this.createStockAdjustment(
        shopId,
        productId,
        variance,
        'correction',
        reconcililedBy,
        `Stock reconciliation: ${notes || ''}`,
      );
    }

    return reconciliation.save();
  }

  async getReconciliationHistory(
    shopId: string,
    filters?: {
      productId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<StockReconciliationDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.productId) {
      query.productId = new Types.ObjectId(filters.productId);
    }

    if (filters?.startDate || filters?.endDate) {
      query.reconciliationDate = {};
      if (filters.startDate) {
        query.reconciliationDate.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.reconciliationDate.$lte = filters.endDate;
      }
    }

    return this.reconciliationModel
      .find(query)
      .sort({ reconciliationDate: -1 })
      .exec();
  }

  async getInventoryStats(shopId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    expiringProducts: number;
    totalStockValue: number;
  }> {
    const products = await this.productModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    const lowStockProducts = products.filter((p) => (p.stock || 0) <= 10).length;
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);
    const expiringProducts = products.filter(
      (p) => p.expiryDate && p.expiryDate <= expiringDate && p.expiryDate >= new Date(),
    ).length;

    const totalStockValue = products.reduce(
      (sum, p) => sum + (p.cost || 0) * (p.stock || 0),
      0,
    );

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.status === 'active').length,
      lowStockProducts,
      expiringProducts,
      totalStockValue,
    };
  }

  // PHASE 4: Branch-specific inventory methods

  /**
   * Get branch-specific stock for product
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getBranchStock(shopId: string, productId: string, branchId: string): Promise<number> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      return 0;
    }

    // If product has branch-specific inventory, return branch stock
    if (product.branchInventory && product.branchInventory[branchId]) {
      return product.branchInventory[branchId].stock || 0;
    }

    // Otherwise return shared stock
    return product.stock || 0;
  }

  /**
   * Update branch-specific stock
   * Multi-tenant safe: filters by shopId
   */
  async updateBranchStock(
    shopId: string,
    productId: string,
    branchId: string,
    quantityChange: number,
  ): Promise<ProductDocument | null> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Initialize branch inventory if needed
    if (!product.branchInventory) {
      product.branchInventory = {};
    }

    if (!product.branchInventory[branchId]) {
      product.branchInventory[branchId] = {
        stock: product.stock || 0,
      };
    }

    // Update branch stock
    product.branchInventory[branchId].stock += quantityChange;

    return product.save();
  }

  /**
   * Get low stock products for branch
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getLowStockProductsByBranch(
    shopId: string,
    branchId: string,
    threshold = 10,
  ): Promise<ProductDocument[]> {
    const products = await this.productModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
      })
      .exec();

    // Filter products with low stock in branch
    return products.filter((p) => {
      const branchStock = p.branchInventory?.[branchId]?.stock ?? p.stock ?? 0;
      return branchStock <= threshold;
    });
  }

  /**
   * Get inventory stats for branch
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getBranchInventoryStats(shopId: string, branchId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    totalStockValue: number;
  }> {
    const products = await this.productModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    let totalStockValue = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      const branchStock = p.branchInventory?.[branchId]?.stock ?? p.stock ?? 0;
      if (branchStock <= 10) {
        lowStockCount++;
      }
      totalStockValue += (p.cost || 0) * branchStock;
    });

    return {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.status === 'active').length,
      lowStockProducts: lowStockCount,
      totalStockValue,
    };
  }

  /**
   * Transfer stock between branches
   * Multi-tenant safe: filters by shopId
   */
  async transferBranchStock(
    shopId: string,
    productId: string,
    fromBranchId: string,
    toBranchId: string,
    quantity: number,
    transferredBy: string,
  ): Promise<ProductDocument | null> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Initialize branch inventory if needed
    if (!product.branchInventory) {
      product.branchInventory = {};
    }

    if (!product.branchInventory[fromBranchId]) {
      product.branchInventory[fromBranchId] = { stock: product.stock || 0 };
    }

    if (!product.branchInventory[toBranchId]) {
      product.branchInventory[toBranchId] = { stock: 0 };
    }

    // Check if source branch has enough stock
    const sourceStock = product.branchInventory[fromBranchId].stock || 0;
    if (sourceStock < quantity) {
      throw new BadRequestException(
        `Insufficient stock in source branch. Available: ${sourceStock}, Requested: ${quantity}`,
      );
    }

    // Transfer stock
    product.branchInventory[fromBranchId].stock -= quantity;
    product.branchInventory[toBranchId].stock += quantity;

    const updated = await product.save();

    // Log transfer as stock adjustment
    await this.createStockAdjustment(
      shopId,
      productId,
      -quantity,
      'transfer',
      transferredBy,
      `Transfer from ${fromBranchId} to ${toBranchId}`,
    );

    return updated;
  }

  /**
   * Add product to a specific branch's inventory
   * This initializes or updates the branchInventory for a product in a specific branch
   * Used when importing products to a branch or manually adding branch inventory
   */
  async addProductToBranch(
    shopId: string,
    productId: string,
    branchId: string,
    initialStock: number,
    addedBy?: string,
  ): Promise<ProductDocument | null> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Initialize branchInventory if needed
    if (!product.branchInventory) {
      product.branchInventory = {};
    }

    // Initialize or update branch stock
    if (!product.branchInventory[branchId]) {
      product.branchInventory[branchId] = { stock: initialStock };
    } else {
      product.branchInventory[branchId].stock = initialStock;
    }

    const updated = await product.save();

    // Log as stock adjustment
    if (addedBy) {
      await this.createStockAdjustment(
        shopId,
        productId,
        initialStock,
        'branch_import',
        addedBy,
        `Product added to branch ${branchId} with initial stock: ${initialStock}`,
      );
    }

    return updated;
  }

  /**
   * Bulk add products to a branch's inventory
   * Used for importing multiple products to a branch at once
   */
  async bulkAddProductsToBranch(
    shopId: string,
    branchId: string,
    products: { productId: string; stock: number }[],
    addedBy?: string,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of products) {
      try {
        await this.addProductToBranch(shopId, item.productId, branchId, item.stock, addedBy);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Product ${item.productId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get comprehensive inventory analytics
   * Supports branch-specific analytics when branchId is provided
   */
  async getInventoryAnalytics(shopId: string, branchId?: string) {
    // Build query - if branchId provided, only get products with inventory in that branch
    const query: any = { shopId: new Types.ObjectId(shopId) };
    if (branchId) {
      query[`branchInventory.${branchId}`] = { $exists: true };
    }

    const products = await this.productModel
      .find(query)
      .exec();

    // Helper function to get stock for a product (branch-specific or main)
    const getStock = (product: any): number => {
      if (branchId && product.branchInventory?.[branchId]) {
        return product.branchInventory[branchId].stock || 0;
      }
      return product.stock || 0;
    };

    const categories = await this.categoryModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    // Basic stats - use getStock for branch-specific stock
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const defaultThreshold = 10;
    // Compare each product's stock against its own lowStockThreshold (or default of 10)
    const lowStockProducts = products.filter(p => {
      const threshold = p.lowStockThreshold ?? defaultThreshold;
      const stock = getStock(p);
      return stock <= threshold && stock > 0;
    }).length;
    const outOfStockProducts = products.filter(p => getStock(p) === 0).length;

    // Stock value - use branch-specific stock
    const totalStockValue = products.reduce((sum, p) => sum + ((p.cost || p.price || 0) * getStock(p)), 0);
    const totalStockUnits = products.reduce((sum, p) => sum + getStock(p), 0);

    // Average stock level
    const averageStockLevel = totalProducts > 0 ? Math.round(totalStockUnits / totalProducts) : 0;

    // Low stock items - compare each product against its own threshold using branch stock
    const lowStockItems = products
      .filter(p => {
        const threshold = p.lowStockThreshold ?? defaultThreshold;
        return getStock(p) <= threshold;
      })
      .sort((a, b) => getStock(a) - getStock(b))
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        stock: getStock(p),
        threshold: p.lowStockThreshold ?? defaultThreshold,
        sku: p.sku || '',
      }));

    // Stock by category - use branch-specific stock
    const categoryMap = new Map<string, { name: string; count: number; value: number }>();
    products.forEach(p => {
      const catId = p.categoryId?.toString() || 'uncategorized';
      const category = categories.find(c => c._id.toString() === catId);
      const catName = category?.name || 'Uncategorized';
      const existing = categoryMap.get(catId) || { name: catName, count: 0, value: 0 };
      existing.count += 1;
      existing.value += (p.cost || p.price || 0) * getStock(p);
      categoryMap.set(catId, existing);
    });
    const stockByCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map(c => ({ category: c.name, count: c.count, value: Math.round(c.value) }));

    // Top moving products (based on stock - lower stock = more sold)
    // Since we don't have salesCount, we'll use products with lower stock as proxy for fast-moving
    const topMovingProducts = products
      .filter(p => p.status === 'active' && getStock(p) > 0)
      .sort((a, b) => getStock(a) - getStock(b)) // Lower stock = more sold
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        soldQty: 0, // Would need sales data to calculate
        currentStock: getStock(p),
      }));

    // Slow moving products (high stock relative to others)
    const slowMovingProducts = products
      .filter(p => p.status === 'active' && getStock(p) > 20)
      .sort((a, b) => getStock(b) - getStock(a)) // Higher stock = slower moving
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        soldQty: 0, // Would need sales data
        currentStock: getStock(p),
        daysSinceLastSale: 30, // Default since we don't track lastSoldAt
      }));

    // Recent stock changes (from adjustments)
    const recentAdjustments = await this.adjustmentModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    // Create a map of product IDs to names for quick lookup
    const productNameMap = new Map<string, string>();
    products.forEach(p => {
      productNameMap.set(p._id.toString(), p.name);
    });

    const recentStockChanges = recentAdjustments.map(adj => {
      const doc = adj as any;
      const productId = doc.productId?.toString() || '';
      const productName = productNameMap.get(productId) || 'Unknown Product';
      return {
        product: productName,
        change: adj.quantityChange || 0,
        type: (adj.quantityChange || 0) > 0 ? 'in' : (adj.reason === 'correction' ? 'adjustment' : 'out'),
        date: doc.createdAt || new Date(),
      };
    });

    // Turnover rate (simplified - would need sales data for accurate calculation)
    const turnoverRate = 3.2; // Placeholder

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue: Math.round(totalStockValue),
      totalStockUnits,
      categoriesCount: categories.length,
      averageStockLevel,
      turnoverRate,
      lowStockItems,
      topMovingProducts,
      slowMovingProducts,
      stockByCategory,
      recentStockChanges,
    };
  }
}
