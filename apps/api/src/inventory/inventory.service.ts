import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { nanoid } from 'nanoid';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Category, CategoryDocument } from './schemas/category.schema';
import {
  StockAdjustment,
  StockAdjustmentDocument,
} from './schemas/stock-adjustment.schema';
import {
  StockReconciliation,
  StockReconciliationDocument,
} from './schemas/stock-reconciliation.schema';
import { Order, OrderDocument } from '../sales/schemas/order.schema';
import {
  CreateProductDto,
  BulkImportOptionsDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategorySuggestionService } from './services/category-suggestion.service';
import { SubscriptionGuardService } from '../subscriptions/subscription-guard.service';
import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../common/dto/pagination.dto';
import { CacheService, CACHE_TTL } from '../common/services/cache.service';

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(StockAdjustment.name)
    private readonly adjustmentModel: Model<StockAdjustmentDocument>,
    @InjectModel(StockReconciliation.name)
    private readonly reconciliationModel: Model<StockReconciliationDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
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

    // P0-9: startup must never mutate physical inventory. Negative stock is
    // detected and logged for manual review only — historical repair is an
    // explicit operator decision, not a silent boot-time rewrite.
    setImmediate(() => {
      this.detectNegativeStock().catch((err) => {
        this.logger.error('Failed to scan for negative stock:', err);
      });
    });
  }

  /**
   * P0-2 RECOVERY SWEEP — reconstruct missing StockAdjustment audit records
   * from durable mutation receipts. Idempotent; safe to run concurrently.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweepUnprojectedStockMutations(): Promise<void> {
    try {
      const result = await this.recoverUnprojectedStockMutations();
      if (result.recovered > 0) {
        this.logger.warn(
          `Stock-audit recovery sweep recovered ${result.recovered} missing audit record(s) across ${result.scanned} product(s)`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Stock-audit recovery sweep failed: ${error?.message}`);
    }
  }

  /**
   * P0-9: detect negative stock for operator visibility — never repair it.
   * Physical corrections require an explicit witnessed mutation
   * (reconciliation or manual adjustment with a stable idempotency key).
   */
  async detectNegativeStock(): Promise<{ detected: number; fixed: number }> {
    try {
      const detected = await this.productModel
        .countDocuments({ stock: { $lt: 0 } })
        .exec();

      if (detected > 0) {
        this.logger.warn(
          `MANUAL_REVIEW_REQUIRED: ${detected} product(s) have negative stock — ` +
            'no automatic repair performed; correct via inventory reconciliation',
        );
      }

      return { detected, fixed: 0 };
    } catch (error) {
      this.logger.error('Error detecting negative stock:', error);
      throw error;
    }
  }

  /**
   * @deprecated negative stock is never silently repaired; kept for API
   * compatibility — delegates to detectNegativeStock (no mutation).
   */
  async fixNegativeStock(): Promise<{ fixed: number }> {
    const { detected } = await this.detectNegativeStock();
    return { fixed: 0 };
  }

  async createProduct(
    shopId: string,
    dto: CreateProductDto,
    actor?: string,
  ): Promise<ProductDocument> {
    // Enforce product limit
    await this.subscriptionGuard.enforceLimit(shopId, 'products');

    // P0-9: initial stock is a witnessed mutation, not a silent field. The
    // durable receipt is embedded in the same document write as the stock
    // itself — creation is atomic; the audit projection is recoverable.
    const productId = new Types.ObjectId();
    const initialStock = dto.stock ?? 0;
    const initMutationId = `product-init:${productId.toString()}`;
    const created = new this.productModel({
      _id: productId,
      shopId: new Types.ObjectId(shopId),
      name: dto.name,
      sku: dto.sku,
      barcode: dto.barcode,
      categoryId: dto.categoryId
        ? new Types.ObjectId(dto.categoryId)
        : undefined,
      price: dto.price,
      cost: dto.cost ?? 0,
      stock: initialStock,
      tax: dto.tax ?? 0,
      status: dto.status ?? 'active',
      ...(initialStock !== 0
        ? {
            stockMutations: [
              {
                mutationId: initMutationId,
                quantityDelta: initialStock,
                reason: 'other',
                actor: actor ?? 'system',
                notes: 'Initial stock on product creation',
                audited: false,
                createdAt: new Date(),
              },
            ],
          }
        : {}),
    });
    const product = await created.save();

    // Project the durable init witness into a StockAdjustment. Failure is
    // recoverable via the P0-2 sweep — the embedded receipt is the authority.
    if (initialStock !== 0) {
      await this.projectStockMutation(shopId, productId.toString(), {
        mutationId: initMutationId,
        quantityDelta: initialStock,
        reason: 'other',
        actor: actor ?? 'system',
        notes: 'Initial stock on product creation',
      });
    }

    // Update usage count
    await this.subscriptionGuard.incrementUsage(shopId, 'products');

    return product;
  }

  async getProductById(
    shopId: string,
    productId: string,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({
        _id: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
  }

  async updateProduct(
    shopId: string,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductDocument | null> {
    // P0-9: routine product edit has no authority over physical stock.
    // Reject loudly rather than silently discarding a requested change.
    if (dto.stock !== undefined) {
      throw new BadRequestException(
        'stock cannot be changed via product edit — use /inventory/adjustments ' +
          'or /inventory/reconciliation so the mutation is witnessed and audited',
      );
    }

    // Atomic metadata-only $set: a stale full-document save must never
    // overwrite a concurrent stock mutation (sale/transfer/receipt).
    const $set: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined) $set.name = dto.name;
    if (dto.sku !== undefined) $set.sku = dto.sku;
    if (dto.barcode !== undefined) $set.barcode = dto.barcode;
    if (dto.categoryId !== undefined) {
      $set.categoryId = dto.categoryId
        ? new Types.ObjectId(dto.categoryId)
        : undefined;
    }
    if (dto.price !== undefined) $set.price = dto.price;
    if (dto.cost !== undefined) $set.cost = dto.cost;
    if (dto.tax !== undefined) $set.tax = dto.tax;
    if (dto.status !== undefined) $set.status = dto.status;
    if (dto.lowStockThreshold !== undefined)
      $set.lowStockThreshold = dto.lowStockThreshold;
    if (dto.description !== undefined) $set.description = dto.description;
    if (dto.image !== undefined) $set.image = dto.image;

    const updated = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
        },
        { $set },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Product not found');
    }

    return updated;
  }

  /**
   * Soft delete a product (sets deletedAt timestamp instead of removing)
   * Product can be restored later if needed
   */
  async deleteProduct(
    shopId: string,
    productId: string,
    userId?: string,
  ): Promise<{ deleted: boolean; message: string }> {
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
        },
      },
    );

    // Decrement product count
    await this.subscriptionGuard.decrementUsage(shopId, 'products');

    return { deleted: true, message: 'Product deleted successfully' };
  }

  /**
   * Restore a soft-deleted product
   */
  async restoreProduct(
    shopId: string,
    productId: string,
  ): Promise<{ restored: boolean; message: string }> {
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
      { $unset: { deletedAt: 1, deletedBy: 1 }, $set: { status: 'active' } },
    );

    // Increment product count
    await this.subscriptionGuard.incrementUsage(shopId, 'products');

    return { restored: true, message: 'Product restored successfully' };
  }

  /**
   * Permanently delete a product (hard delete)
   * Use with caution - this cannot be undone
   */
  async permanentlyDeleteProduct(
    shopId: string,
    productId: string,
  ): Promise<{ deleted: boolean; message: string }> {
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

  async listProducts(
    shopId: string,
    q: QueryProductsDto,
  ): Promise<ProductDocument[]> {
    const filter: FilterQuery<ProductDocument> = {
      shopId: new Types.ObjectId(shopId),
      deletedAt: { $exists: false }, // Exclude soft-deleted products by default
    };

    if (q.q) {
      const searchTerm = q.q.trim();

      // Check if search term looks like a barcode (numeric, 8-14 digits)
      const isBarcodeLike = /^\d{8,14}$/.test(searchTerm);

      // Check if search term looks like a SKU (alphanumeric, typically shorter)
      const isSkuLike =
        /^[A-Za-z0-9-_]{3,20}$/.test(searchTerm) && !isBarcodeLike;

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
      return products.map((product) => {
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
      const isSkuLike =
        /^[A-Za-z0-9-_]{3,20}$/.test(searchTerm) && !isBarcodeLike;

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
      this.productModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
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
      () =>
        this.productModel.countDocuments({
          shopId: new Types.ObjectId(shopId),
        }),
      CACHE_TTL.STATS,
    );
  }

  /**
   * Find product by exact barcode match
   * Used for barcode scanner - returns single product or null
   * Also checks SKU as fallback for backwards compatibility
   */
  async findByBarcode(
    shopId: string,
    barcode: string,
  ): Promise<ProductDocument | null> {
    const trimmedBarcode = barcode.trim();
    const shopObjId = new Types.ObjectId(shopId);

    // Try exact barcode match first
    let product = await this.productModel
      .findOne({
        shopId: shopObjId,
        barcode: trimmedBarcode,
        status: 'active',
        deletedAt: { $exists: false },
      })
      .exec();

    // If not found, try with leading zeros removed (some scanners add/remove leading zeros)
    if (!product && trimmedBarcode.startsWith('0')) {
      product = await this.productModel
        .findOne({
          shopId: shopObjId,
          barcode: trimmedBarcode.replace(/^0+/, ''),
          status: 'active',
          deletedAt: { $exists: false },
        })
        .exec();
    }

    // If still not found, try adding leading zero (EAN-13 vs UPC-A conversion)
    if (!product && trimmedBarcode.length === 12) {
      product = await this.productModel
        .findOne({
          shopId: shopObjId,
          barcode: '0' + trimmedBarcode,
          status: 'active',
          deletedAt: { $exists: false },
        })
        .exec();
    }

    // FALLBACK: Check SKU field for backwards compatibility
    // (products created before barcode/SKU separation)
    if (!product) {
      product = await this.productModel
        .findOne({
          shopId: shopObjId,
          sku: trimmedBarcode,
          status: 'active',
          deletedAt: { $exists: false },
        })
        .exec();
    }

    return product;
  }

  /**
   * Find product by SKU
   */
  async findBySku(
    shopId: string,
    sku: string,
  ): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        sku: { $regex: `^${sku.trim()}$`, $options: 'i' }, // Case-insensitive exact match
        status: 'active',
      })
      .exec();
  }

  /**
   * Quick search for POS - optimized for speed
   * Searches barcode (exact), SKU (prefix), and name (contains)
   */
  async quickSearch(
    shopId: string,
    term: string,
    limit: number = 10,
  ): Promise<ProductDocument[]> {
    const searchTerm = term.trim();
    if (!searchTerm) return [];

    const shopObjectId = new Types.ObjectId(shopId);

    // First, try exact barcode match (fastest for scanner)
    const exactBarcode = await this.productModel
      .findOne({
        shopId: shopObjectId,
        barcode: searchTerm,
        status: 'active',
      })
      .exec();

    if (exactBarcode) {
      return [exactBarcode];
    }

    // Then try SKU prefix match
    const skuMatches = await this.productModel
      .find({
        shopId: shopObjectId,
        sku: { $regex: `^${searchTerm}`, $options: 'i' },
        status: 'active',
      })
      .limit(limit)
      .exec();

    if (skuMatches.length > 0) {
      return skuMatches;
    }

    // Finally, search by name
    return this.productModel
      .find({
        shopId: shopObjectId,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { barcode: { $regex: searchTerm, $options: 'i' } },
        ],
        status: 'active',
      })
      .limit(limit)
      .exec();
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
        },
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
        rootCategories: categories.filter((c) => !c.parentId).length,
        totalProducts,
        categorizedProducts: categorizedCount,
        uncategorizedProducts: uncategorizedCount,
      },
    } as any;
  }

  /**
   * Sync all category product counts for a shop
   * This fixes any stale productCount values in the database
   */
  async syncCategoryProductCounts(
    shopId: string,
  ): Promise<{ synced: number; updated: number }> {
    const shopObjId = new Types.ObjectId(shopId);

    // Get accurate counts using aggregation (excludes soft-deleted products)
    const productCounts = await this.productModel.aggregate([
      {
        $match: {
          shopId: shopObjId,
          deletedAt: { $exists: false },
        },
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

    this.logger.log(
      `Synced category counts for shop ${shopId}: ${categories.length} categories, ${updated} updated`,
    );
    return { synced: categories.length, updated };
  }

  async createCategory(
    shopId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryDocument> {
    // Generate slug if not provided
    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

    // Check for duplicate slug within shop
    const existing = await this.categoryModel.findOne({
      shopId: new Types.ObjectId(shopId),
      slug,
    });

    if (existing) {
      throw new BadRequestException(
        `Category with slug "${slug}" already exists`,
      );
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

  async updateCategory(
    shopId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDocument | null> {
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
        throw new BadRequestException(
          `Category with slug "${dto.slug}" already exists`,
        );
      }
    }

    // Update fields
    if (dto.name) category.name = dto.name;
    if (dto.slug) category.slug = dto.slug;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.parentId !== undefined) {
      category.parentId = dto.parentId
        ? new Types.ObjectId(dto.parentId)
        : undefined;
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

  async getCategoryWithProducts(
    shopId: string,
    categoryId: string,
  ): Promise<any> {
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

  /**
   * P0-2 — CANONICAL STOCK-MUTATION CONTRACT.
   *
   * ONE logical stock movement = ONE physical quantity change + ONE durable
   * mutation receipt + ONE durable audit record.
   *
   * The receipt is pushed in the SAME document write as the $inc, so receipt
   * presence proves the mutation landed and receipt absence proves it never
   * did — there is no window in which stock moves without durable evidence.
   * Mutation-identity idempotency: a retry with the same mutationId matches
   * nothing and performs zero additional stock effect. The StockAdjustment
   * audit projection happens separately; if it fails, the durable receipt
   * remains and recovery reconstructs the audit from receipt facts (never
   * from current stock).
   *
   * Negative-delta safety fails closed: a reduction that would drive stock
   * below zero is REJECTED before any write — no partial fulfillment, no
   * success receipt, no audit record. Absolute corrections
   * (reconciliation/stocktake) compute a variance bounded by the physical
   * count (>= 0), so they cannot legitimately overdraw.
   */
  private async applyStockMutation(params: {
    shopId: string;
    productId: string;
    quantityDelta: number;
    mutationId: string;
    reason: string;
    actor: string;
    referenceType?: string;
    referenceId?: string;
    branchId?: string;
    notes?: string;
    skipAuditProjection?: boolean;
  }): Promise<ProductDocument | null> {
    const {
      shopId,
      productId,
      quantityDelta,
      mutationId,
      reason,
      actor,
      referenceType,
      referenceId,
      branchId,
      notes,
    } = params;

    const existing = await this.productModel
      .findOne({
        _id: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();

    if (!existing) {
      return null;
    }

    // Idempotent retry: a durable witness for this mutationId proves the
    // mutation already landed. Evidence lives in TWO places across the
    // lifecycle — the embedded receipt (mutation landed, audit pending) and,
    // after projection+cleanup, the StockAdjustment record itself (which
    // carries the mutationId permanently). Either one proves "already
    // applied" — the physical write is a proven no-op.
    // P0-9: a mutation identity is immutable business intent — the same id
    // with a different delta/branch is a conflict, never a silent no-op.
    const existingReceipt = (existing.stockMutations ?? []).find(
      (m: any) => m.mutationId === mutationId,
    );
    const existingAudit = existingReceipt
      ? null
      : await this.adjustmentModel
          .findOne({
            shopId: new Types.ObjectId(shopId),
            mutationId,
          })
          .exec();
    this.assertMutationCompatible(
      mutationId,
      quantityDelta,
      branchId,
      existingReceipt,
      existingAudit,
      productId,
      reason,
    );
    if (existingReceipt || existingAudit) {
      this.logger.log(
        `Stock mutation ${mutationId} already applied for product ${productId} - no additional stock effect`,
      );
      return existing;
    }

    // Negative-delta safety fails closed: a reduction that would drive stock
    // below zero is rejected before the atomic write. Partial fulfillment
    // (clamp) would create order/inventory divergence — the caller asked for
    // N units and must not silently receive fewer.
    const currentStock = existing.stock || 0;
    if (quantityDelta < 0 && currentStock + quantityDelta < 0) {
      throw new BadRequestException(
        `Insufficient stock for product ${productId}: requested ${-quantityDelta}, available ${currentStock}`,
      );
    }

    const receipt = {
      mutationId,
      quantityDelta,
      reason,
      actor,
      ...(referenceType ? { referenceType } : {}),
      ...(referenceId ? { referenceId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(notes ? { notes } : {}),
      audited: false,
      createdAt: new Date(),
    };

    // ATOMIC: the physical change and its durable witness share one document
    // write. Receipt present = mutation landed; receipt absent = never applied.
    const updated = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
          'stockMutations.mutationId': { $ne: mutationId },
        },
        {
          $inc: { stock: quantityDelta },
          $push: {
            stockMutations: {
              mutationId,
              quantityDelta,
              reason,
              actor,
              ...(referenceType ? { referenceType } : {}),
              ...(referenceId ? { referenceId } : {}),
              ...(branchId ? { branchId } : {}),
              ...(notes ? { notes } : {}),
              audited: false,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      // Lost an idempotency race against a concurrent identical mutation —
      // the winner's receipt is the durable evidence.
      const canonical = await this.productModel
        .findOne({
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      this.assertMutationCompatible(
        mutationId,
        quantityDelta,
        branchId,
        (canonical?.stockMutations ?? []).find(
          (m: any) => m.mutationId === mutationId,
        ),
        null,
        productId,
        reason,
      );
      this.logger.log(
        `Stock mutation ${mutationId} lost an idempotency race - canonical receipt already present`,
      );
      return canonical;
    }

    // NOTE: the audit projection is performed by the public entry points
    // (updateStock / branch methods) which own the business context. This
    // primitive only guarantees the atomic mutation + durable receipt.
    return updated;
  }

  /**
   * P0-9: a mutation identity binds immutable intent. The same mutationId
   * with a different quantity delta or branch scope is a genuine conflict —
   * never reinterpret it as a successful replay.
   */
  private assertMutationCompatible(
    mutationId: string,
    quantityDelta: number,
    branchId: string | undefined,
    receipt: any,
    audit: any,
    productId?: string,
    reason?: string,
  ): void {
    const witness = receipt ?? audit;
    if (!witness) return;
    const witnessedDelta = receipt
      ? receipt.quantityDelta
      : audit.quantityChange;
    if (witnessedDelta !== quantityDelta) {
      throw new ConflictException(
        `Stock mutation ${mutationId} already exists with quantity ${witnessedDelta} — ` +
          `conflicting request for ${quantityDelta}; a mutation identity is immutable`,
      );
    }
    // Audit-level witnesses are shop-scoped: the same identity bound to a
    // different product is a different business intent — conflict.
    if (
      audit &&
      productId !== undefined &&
      audit.productId &&
      audit.productId.toString() !== productId
    ) {
      throw new ConflictException(
        `Stock mutation ${mutationId} already exists for a different product — ` +
          'a mutation identity is immutable',
      );
    }
    if (
      receipt &&
      branchId !== undefined &&
      receipt.branchId !== undefined &&
      String(receipt.branchId) !== branchId
    ) {
      throw new ConflictException(
        `Stock mutation ${mutationId} already exists for a different branch scope — ` +
          'a mutation identity is immutable',
      );
    }
    // P0-9A: semantic reason is part of immutable intent — same key + same
    // delta + different reason is a conflict, never a successful replay.
    // Receipts store the raw reason and audits store the canonical enum, so
    // both sides are canonicalized before comparing.
    if (reason !== undefined) {
      const canon = this.toAdjustmentReason(reason);
      if (receipt && this.toAdjustmentReason(receipt.reason) !== canon) {
        throw new ConflictException(
          `Stock mutation ${mutationId} already exists with reason "${receipt.reason}" — ` +
            `conflicting request for "${reason}"; a mutation identity is immutable`,
        );
      }
      if (audit && audit.reason && audit.reason !== canon) {
        throw new ConflictException(
          `Stock mutation ${mutationId} already exists with reason "${audit.reason}" — ` +
            `conflicting request for "${reason}"; a mutation identity is immutable`,
        );
      }
    }
  }

  /**
   * AUDIT PROJECTION — persist the StockAdjustment for a durable receipt and
   * finalize the receipt. Failure of the projection leaves the receipt in
   * place (audited: false) for recovery; it never throws to the caller
   * because the physical mutation has already landed.
   */
  private async projectStockMutation(
    shopId: string,
    productId: string,
    receipt: {
      mutationId: string;
      quantityDelta: number;
      reason: string;
      actor: string;
      referenceType?: string;
      referenceId?: string;
      branchId?: string;
      notes?: string;
    },
  ): Promise<void> {
    try {
      const existing = await this.adjustmentModel
        .findOne({
          shopId: new Types.ObjectId(shopId),
          mutationId: receipt.mutationId,
        })
        .exec();

      if (!existing) {
        await this.createStockAdjustment(
          shopId,
          productId,
          receipt.quantityDelta,
          this.toAdjustmentReason(receipt.reason),
          receipt.actor,
          receipt.notes,
          receipt.mutationId,
        );
      }

      // Finalize: mark audited, then pull. A crash between the two leaves an
      // audited receipt that recovery safely removes without duplicating the
      // audit record (mutationId pre-read guards every path).
      await this.productModel
        .updateOne(
          {
            _id: new Types.ObjectId(productId),
            shopId: new Types.ObjectId(shopId),
          },
          { $set: { 'stockMutations.$[m].audited': true } },
          { arrayFilters: [{ 'm.mutationId': receipt.mutationId }] },
        )
        .exec();
      await this.productModel
        .updateOne(
          {
            _id: new Types.ObjectId(productId),
            shopId: new Types.ObjectId(shopId),
          },
          {
            $pull: {
              stockMutations: { mutationId: receipt.mutationId, audited: true },
            },
          },
        )
        .exec();
    } catch (error: any) {
      // The durable receipt remains — recovery reconstructs the audit.
      this.logger.error(
        `Audit projection failed for stock mutation ${receipt.mutationId} (product ${productId}): ${error?.message} - durable receipt retained for recovery`,
      );
    }
  }

  /**
   * RECOVERY — reconstruct missing StockAdjustment audit records from durable
   * mutation receipts. Uses receipt facts only (never current-stock guesses).
   * Idempotent and concurrency-safe: the (shopId, mutationId) unique index
   * ensures exactly one audit record per mutation; audited receipts are
   * finalized and pulled.
   */
  async recoverUnprojectedStockMutations(shopId?: string): Promise<{
    scanned: number;
    recovered: number;
    alreadyAudited: number;
  }> {
    const filter: any = { stockMutations: { $exists: true, $ne: [] } };
    if (shopId) {
      filter.shopId = new Types.ObjectId(shopId);
    }

    const products = await this.productModel.find(filter).exec();
    let recovered = 0;
    let alreadyAudited = 0;

    for (const product of products) {
      for (const receipt of product.stockMutations ?? []) {
        if (receipt.audited) {
          // Crash-after-audit window: audit exists, only cleanup remained.
          alreadyAudited += 1;
          continue;
        }

        const existing = await this.adjustmentModel
          .findOne({
            shopId: product.shopId,
            mutationId: receipt.mutationId,
          })
          .exec();

        if (!existing) {
          try {
            await this.createStockAdjustment(
              product.shopId.toString(),
              product._id.toString(),
              receipt.quantityDelta,
              this.toAdjustmentReason(receipt.reason),
              receipt.actor,
              receipt.notes ??
                `Recovered audit for mutation ${receipt.mutationId}${receipt.referenceId ? ` (${receipt.referenceType ?? 'event'} ${receipt.referenceId})` : ''}`,
              receipt.mutationId,
            );
            recovered += 1;
            this.logger.warn(
              `Recovered missing stock audit from durable receipt ${receipt.mutationId} (product ${product._id}, delta ${receipt.quantityDelta})`,
            );
          } catch (error: any) {
            if (error?.code === 11000) {
              // Concurrent recovery worker won the unique index - treat as
              // projected.
              alreadyAudited += 1;
            } else {
              this.logger.error(
                `Failed to recover stock audit for mutation ${receipt.mutationId}: ${error?.message}`,
              );
              continue;
            }
          }
        } else {
          alreadyAudited += 1;
        }

        await this.productModel
          .updateOne(
            { _id: product._id, shopId: product.shopId },
            { $set: { 'stockMutations.$[m].audited': true } },
            { arrayFilters: [{ 'm.mutationId': receipt.mutationId }] },
          )
          .exec();
      }

      // Cleanup: remove finalized receipts (audit durably persisted).
      await this.productModel
        .updateOne(
          { _id: product._id, shopId: product.shopId },
          { $pull: { stockMutations: { audited: true } } },
        )
        .exec();
    }

    if (recovered > 0 || alreadyAudited > 0) {
      this.logger.log(
        `Stock-audit recovery sweep: scanned ${products.length} product(s), recovered ${recovered}, finalized ${alreadyAudited}`,
      );
    }

    return { scanned: products.length, recovered, alreadyAudited };
  }

  /**
   * OBSERVABILITY — count durable receipts awaiting audit projection.
   */
  async countUnprojectedStockMutations(shopId?: string): Promise<number> {
    const filter: any = { 'stockMutations.audited': false };
    if (shopId) {
      filter.shopId = new Types.ObjectId(shopId);
    }
    const products = await this.productModel
      .find(filter)
      .select('stockMutations')
      .exec();
    return products.reduce(
      (sum: number, p: any) =>
        sum +
        (p.stockMutations ?? []).filter((m: any) => m.audited === false).length,
      0,
    );
  }

  async updateStock(
    shopId: string,
    productId: string,
    quantityChange: number,
    evidence?: {
      mutationId?: string;
      reason?: string;
      actor?: string;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    },
  ): Promise<ProductDocument | null> {
    const mutationId = evidence?.mutationId ?? `mutation:${nanoid(16)}`;
    const reason = evidence?.reason ?? 'other';

    const updated = await this.applyStockMutation({
      shopId,
      productId,
      quantityDelta: quantityChange,
      mutationId,
      reason,
      actor: evidence?.actor ?? 'system',
      referenceType: evidence?.referenceType,
      referenceId: evidence?.referenceId,
      notes: evidence?.notes,
    });

    if (!updated) {
      return null;
    }

    // AUDIT PROJECTION — durable receipt already witnesses the mutation; the
    // StockAdjustment record is the queryable projection. Projection failure
    // is logged + recoverable, never thrown.
    const appliedReceipt = (updated.stockMutations ?? []).find(
      (m: any) => m.mutationId === mutationId,
    );
    await this.projectStockMutation(shopId, productId, {
      mutationId,
      quantityDelta: appliedReceipt
        ? appliedReceipt.quantityDelta
        : quantityChange,
      reason,
      actor: evidence?.actor ?? 'system',
      referenceType: evidence?.referenceType,
      referenceId: evidence?.referenceId,
      notes: evidence?.notes,
    });

    return updated;
  }

  async getLowStockProducts(
    shopId: string,
    defaultThreshold = 10,
  ): Promise<ProductDocument[]> {
    // Use MongoDB $expr to compare stock against each product's own lowStockThreshold
    // Falls back to defaultThreshold if product doesn't have lowStockThreshold set
    return this.productModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
        $expr: {
          $lte: [
            '$stock',
            { $ifNull: ['$lowStockThreshold', defaultThreshold] },
          ],
        },
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
  /**
   * P0-9: project each imported product's embedded init witness into a
   * StockAdjustment. Failures are recoverable — the embedded receipt remains
   * authoritative and the P0-2 sweep finishes the projection.
   */
  private async projectImportedInitialStock(
    shopId: string,
    insertedDocs: any[],
    actor?: string,
  ): Promise<void> {
    for (const doc of insertedDocs ?? []) {
      const receipt = (doc?.stockMutations ?? []).find(
        (m: any) =>
          String(m.mutationId).startsWith('product-init:') ||
          String(m.mutationId).startsWith('import-init:'),
      );
      if (!receipt || !doc?._id) continue;
      await this.projectStockMutation(shopId, doc._id.toString(), {
        mutationId: receipt.mutationId,
        quantityDelta: receipt.quantityDelta,
        reason: receipt.reason,
        actor: receipt.actor ?? actor ?? 'system',
        notes: receipt.notes,
      });
    }
  }

  async importProducts(
    shopId: string,
    products: CreateProductDto[],
    options: BulkImportOptionsDto = {},
    actor?: string,
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
      importOperationId,
    } = options;

    // P0-9A: a logical import needs a stable operation identity. SKU/barcode
    // are optional, so they cannot be the only retry mechanism — without a
    // durable per-row identity a lost-response retry duplicates products and
    // double-applies initial stock.
    if (!importOperationId) {
      throw new BadRequestException(
        'options.importOperationId is required — the client must generate one ' +
          'stable identity per logical import and reuse it across retries',
      );
    }

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
          this.logger.log(
            `Importing all products to category: ${categoryExists.name}`,
          );
        } else {
          errors.push(`Target category not found: ${targetCategoryId}`);
        }
      } catch (err) {
        errors.push(`Invalid target category ID: ${targetCategoryId}`);
      }
    }

    // Step 1: Build category name to ID mapping
    const categoryNameToId = new Map<string, Types.ObjectId>();
    const existingCategories = await this.categoryModel
      .find({ shopId: shopObjId })
      .lean()
      .exec();

    existingCategories.forEach((cat) => {
      categoryNameToId.set(cat.name.toLowerCase(), cat._id);
      if (cat.slug) categoryNameToId.set(cat.slug, cat._id);
    });

    // Step 1b: Build supplier name → ID map (for resolving `supplier` column)
    const supplierNameToId = new Map<string, Types.ObjectId>();
    try {
      const suppliersCol = this.productModel.db.collection('suppliers');
      const existingSuppliers = await suppliersCol
        .find({ shopId: shopObjId })
        .project({ _id: 1, name: 1 })
        .toArray();
      existingSuppliers.forEach((s: any) => {
        if (s.name)
          supplierNameToId.set(String(s.name).toLowerCase().trim(), s._id);
      });
    } catch (err) {
      this.logger.warn(
        `Could not preload suppliers for import: ${err?.message}`,
      );
    }

    // Step 2: Collect all unique category names and suggest categories
    const categoryNamesToCreate = new Set<string>();

    for (const product of products) {
      let categoryName = product.category;

      if (!categoryName && !product.categoryId && autoSuggestCategories) {
        const suggested = this.categorySuggestionService.suggestCategory(
          product.name,
          product.brand,
        );
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
      const categoriesToInsert = Array.from(categoryNamesToCreate).map(
        (name) => ({
          shopId: shopObjId,
          name,
          slug: this.generateSlug(name),
          status: 'active',
          productCount: 0,
        }),
      );

      try {
        const insertedCategories = await this.categoryModel.insertMany(
          categoriesToInsert,
          { ordered: false },
        );
        insertedCategories.forEach((cat) => {
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
    const skus = products.map((p) => p.sku).filter(Boolean) as string[];
    const barcodes = products.map((p) => p.barcode).filter(Boolean) as string[];

    const existingProductsMap = new Map<string, ProductDocument>();

    // P0-9A: durable per-row import identities — `${opId}:${rowId}`, where
    // rowId is the client-supplied rowId or the stable row index.
    const rowIdentityFor = (dto: CreateProductDto, i: number) =>
      `${importOperationId}:${dto.rowId ?? i}`;
    const importIdentities = products.map((p, i) => rowIdentityFor(p, i));

    if (skus.length > 0 || barcodes.length > 0 || importIdentities.length > 0) {
      const existingProducts = await this.productModel
        .find({
          shopId: shopObjId,
          $or: [
            ...(skus.length > 0 ? [{ sku: { $in: skus } }] : []),
            ...(barcodes.length > 0 ? [{ barcode: { $in: barcodes } }] : []),
            { importIdentity: { $in: importIdentities } },
          ],
        })
        .lean()
        .exec();

      existingProducts.forEach((p) => {
        if (p.sku) existingProductsMap.set(`sku:${p.sku}`, p as any);
        if (p.barcode)
          existingProductsMap.set(`barcode:${p.barcode}`, p as any);
        if (p.importIdentity)
          existingProductsMap.set(`import:${p.importIdentity}`, p as any);
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
        categoryId = categoryNameToId.get(
          categorySuggestions[dto.name].toLowerCase(),
        );
      }

      // P0-9A replay detection — the durable import identity proves this row
      // was already processed even when it has no SKU/barcode. Identical
      // replay skips; same identity carrying different stock/name is a
      // conflict, never a silent reinterpretation.
      const importIdentity = rowIdentityFor(dto, i);
      const existingByImport = existingProductsMap.get(
        `import:${importIdentity}`,
      );
      if (existingByImport) {
        const sameIntent =
          (dto.stock ?? null) === (existingByImport.importStock ?? null) &&
          dto.name === existingByImport.name;
        if (!sameIntent) {
          errors.push(
            `Row ${i + 1} (${dto.name}): conflicts with a row already imported under ` +
              `import operation "${importOperationId}" — a retried import must carry ` +
              'identical row payloads; use a new importOperationId for a different import',
          );
          continue;
        }
        if (
          existingByImport.importStockApplied === false &&
          dto.stock !== undefined
        ) {
          errors.push(
            `Row ${i + 1} (${dto.name}): stock ${dto.stock} ignored for existing product — ` +
              'stock changes require /inventory/adjustments or reconciliation',
          );
        }
        skipped++;
        continue;
      }

      // Check for existing product
      const existingBySku = dto.sku
        ? existingProductsMap.get(`sku:${dto.sku}`)
        : null;
      const existingByBarcode = dto.barcode
        ? existingProductsMap.get(`barcode:${dto.barcode}`)
        : null;
      const existingProduct = existingBySku || existingByBarcode;

      // Resolve preferredSupplierId from dto.supplier (name) or dto.preferredSupplierId (ObjectId)
      let preferredSupplierId: Types.ObjectId | undefined;
      if ((dto as any).preferredSupplierId) {
        try {
          preferredSupplierId = new Types.ObjectId(
            (dto as any).preferredSupplierId,
          );
        } catch {
          // Invalid ObjectId, fall through to name resolution
        }
      }
      if (!preferredSupplierId && (dto as any).supplier) {
        const supplierName = String((dto as any).supplier)
          .toLowerCase()
          .trim();
        preferredSupplierId = supplierNameToId.get(supplierName);
        if (!preferredSupplierId) {
          // Non-blocking: product will still import, but without supplier link.
          // Surface as a warning via the errors list so the UI can show it.
          errors.push(
            `Row ${i + 1}: Supplier "${(dto as any).supplier}" not found — product imported without supplier link (create the supplier and re-import to link it)`,
          );
        }
      }

      // Build extended field payload (only include fields explicitly present on DTO)
      const extendedFields: any = {};
      const optionalStringFields = [
        'unitOfMeasure',
        'weightUnit',
        'batchNumber',
        'lotNumber',
        'serialNumber',
        'imeiNumber',
        'drugSchedule',
        'dosageForm',
        'strength',
        'activeIngredient',
        'storageConditions',
        'manufacturer',
        'size',
        'color',
        'material',
        'season',
        'vehicleMake',
        'vehicleModel',
        'vehicleYear',
        'partNumber',
        'oemNumber',
        'withdrawalPeriod',
      ];
      for (const f of optionalStringFields) {
        if (
          (dto as any)[f] !== undefined &&
          (dto as any)[f] !== null &&
          (dto as any)[f] !== ''
        ) {
          extendedFields[f] = (dto as any)[f];
        }
      }
      const optionalNumberFields = [
        'weight',
        'pricePerUnit',
        'warrantyMonths',
        'preparationTime',
        'calorieCount',
        'coreCharge',
        'duration',
        'reorderQuantity',
        'leadTimeDays',
      ];
      for (const f of optionalNumberFields) {
        const v = (dto as any)[f];
        if (v !== undefined && v !== null && v !== '' && !isNaN(Number(v))) {
          extendedFields[f] = Number(v);
        }
      }
      // Date fields
      if ((dto as any).expiryDate) {
        const d = new Date((dto as any).expiryDate);
        if (!isNaN(d.getTime())) extendedFields.expiryDate = d;
      }
      if ((dto as any).warrantyExpiry) {
        const d = new Date((dto as any).warrantyExpiry);
        if (!isNaN(d.getTime())) extendedFields.warrantyExpiry = d;
      }
      // Boolean fields
      if ((dto as any).requiresPrescription !== undefined) {
        extendedFields.requiresPrescription = !!(dto as any)
          .requiresPrescription;
      }
      if ((dto as any).isService !== undefined) {
        extendedFields.isService = !!(dto as any).isService;
      }
      // Array fields
      if (Array.isArray((dto as any).tags) && (dto as any).tags.length) {
        extendedFields.tags = (dto as any).tags;
      }
      if (
        Array.isArray((dto as any).ingredients) &&
        (dto as any).ingredients.length
      ) {
        extendedFields.ingredients = (dto as any).ingredients;
      }
      if (
        Array.isArray((dto as any).allergens) &&
        (dto as any).allergens.length
      ) {
        extendedFields.allergens = (dto as any).allergens;
      }
      if (
        Array.isArray((dto as any).targetSpecies) &&
        (dto as any).targetSpecies.length
      ) {
        extendedFields.targetSpecies = (dto as any).targetSpecies;
      }
      if (preferredSupplierId) {
        extendedFields.preferredSupplierId = preferredSupplierId;
      }

      if (existingProduct) {
        if (updateExisting) {
          // P0-9: an import row may never overwrite existing physical stock.
          // Stock corrections require a witnessed adjustment/reconciliation.
          if (dto.stock !== undefined && dto.stock !== existingProduct.stock) {
            errors.push(
              `Row ${i + 1} (${dto.name}): stock ${dto.stock} ignored for existing product — ` +
                'stock changes require /inventory/adjustments or reconciliation',
            );
          }
          updateOperations.push({
            updateOne: {
              filter: { _id: existingProduct._id },
              update: {
                $set: {
                  name: dto.name,
                  price: dto.price,
                  cost: dto.cost ?? existingProduct.cost ?? 0,
                  tax: dto.tax ?? existingProduct.tax ?? 0,
                  categoryId: categoryId ?? existingProduct.categoryId,
                  status: dto.status ?? existingProduct.status ?? 'active',
                  description: dto.description ?? existingProduct.description,
                  brand: dto.brand ?? existingProduct.brand,
                  lowStockThreshold:
                    dto.lowStockThreshold ??
                    existingProduct.lowStockThreshold ??
                    10,
                  reorderPoint:
                    dto.reorderPoint ?? existingProduct.reorderPoint ?? 0,
                  // P0-9A: stamp the durable row identity so a retry of this
                  // logical import replays instead of re-updating.
                  importIdentity,
                  importStock: dto.stock,
                  importStockApplied: false,
                  ...extendedFields,
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

      // Prepare new product for bulk insert. P0-9: initial stock carries an
      // embedded durable witness in the same document write — the receipt's
      // identity is derived from the product _id, so an ambiguous import retry
      // (same rows) can never produce a second physical mutation.
      const newProductId = new Types.ObjectId();
      const initialStock = dto.stock ?? 0;
      productsToInsert.push({
        _id: newProductId,
        shopId: shopObjId,
        name: dto.name,
        sku: dto.sku || undefined,
        barcode: dto.barcode || undefined,
        categoryId,
        price: dto.price,
        cost: dto.cost ?? 0,
        stock: initialStock,
        tax: dto.tax ?? 0,
        status: dto.status ?? 'active',
        description: dto.description,
        brand: dto.brand,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
        reorderPoint: dto.reorderPoint ?? 0,
        // P0-9A: durable row identity + requested stock — replay evidence.
        importIdentity,
        importStock: dto.stock,
        importStockApplied: initialStock !== 0,
        ...extendedFields,
        ...(initialStock !== 0
          ? {
              stockMutations: [
                {
                  mutationId: `import-init:${importIdentity}`,
                  quantityDelta: initialStock,
                  reason: 'other',
                  actor: actor ?? 'system',
                  notes: 'Initial stock on product import',
                  audited: false,
                  createdAt: new Date(),
                },
              ],
            }
          : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Track category product counts
      if (categoryId) {
        const catIdStr = categoryId.toString();
        categoryProductCounts.set(
          catIdStr,
          (categoryProductCounts.get(catIdStr) || 0) + 1,
        );
      }
    }

    // Step 6: Execute bulk insert
    if (productsToInsert.length > 0) {
      try {
        const result = await this.productModel.insertMany(productsToInsert, {
          ordered: false,
        });
        imported = result.length;
        await this.projectImportedInitialStock(shopId, result, actor);
      } catch (err: any) {
        // Handle partial failures — still project witnesses for the rows
        // that physically landed.
        if (err.insertedDocs) {
          imported = err.insertedDocs.length;
          await this.projectImportedInitialStock(
            shopId,
            err.insertedDocs,
            actor,
          );
        }
        if (err.writeErrors) {
          err.writeErrors.forEach((writeErr: any) => {
            const idx = writeErr.index;
            const productName = productsToInsert[idx]?.name || 'Unknown';
            let errorMsg = writeErr.errmsg || 'Failed to insert';

            // Make duplicate key errors more user-friendly
            if (
              errorMsg.includes('duplicate key') ||
              errorMsg.includes('E11000')
            ) {
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

    // Step 6b: (projection handled inside the insert block above)

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
      const categoryUpdateOps = Array.from(categoryProductCounts.entries()).map(
        ([catId, count]) => ({
          updateOne: {
            filter: { _id: new Types.ObjectId(catId) },
            update: { $inc: { productCount: count } },
          },
        }),
      );

      try {
        await this.categoryModel.bulkWrite(categoryUpdateOps, {
          ordered: false,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to update category counts: ${err.message}`);
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Import complete in ${duration}ms: ${imported} imported, ${updated} updated, ` +
        `${skipped} skipped, ${categoriesCreated.length} categories created`,
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
  async analyzeImport(
    shopId: string,
    products: CreateProductDto[],
  ): Promise<{
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
    const existingCategories = await this.categoryModel
      .find({
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    const existingCategoryNames = new Set(
      existingCategories.map((c) => c.name.toLowerCase()),
    );

    // Analyze products
    const analysis = this.categorySuggestionService.analyzeProducts(products);

    // Determine which categories are new vs existing
    const newCategories: string[] = [];
    const existingCategoriesUsed: string[] = [];

    Object.keys(analysis.suggestedCategories).forEach((category) => {
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
        const existing = await this.productModel
          .findOne({
            shopId: new Types.ObjectId(shopId),
            $or: [
              ...(product.sku ? [{ sku: product.sku }] : []),
              ...(product.barcode ? [{ barcode: product.barcode }] : []),
            ],
          })
          .exec();
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

  async exportProducts(
    shopId: string,
    res: any,
    categoryId?: string,
  ): Promise<void> {
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
      const categoryMap = new Map(
        categories.map((c) => [c._id.toString(), c.name]),
      );

      // Get suppliers for name lookup (preferredSupplierId -> name)
      const supplierIds = Array.from(
        new Set(
          products
            .map((p) => (p as any).preferredSupplierId?.toString())
            .filter(Boolean),
        ),
      );
      const supplierMap = new Map<string, string>();
      if (supplierIds.length > 0) {
        try {
          const suppliers = await this.productModel.db
            .collection('suppliers')
            .find({
              _id: { $in: supplierIds.map((id) => new Types.ObjectId(id)) },
            })
            .project({ name: 1 })
            .toArray();
          suppliers.forEach((s: any) =>
            supplierMap.set(s._id.toString(), s.name),
          );
        } catch (err) {
          this.logger.warn(
            `Could not resolve supplier names for export: ${err?.message}`,
          );
        }
      }

      // Headers cover every field the import pipeline can persist (see importProducts)
      const headers = [
        'name',
        'sku',
        'barcode',
        'price',
        'cost',
        'stock',
        'category',
        'brand',
        'tax',
        'status',
        'description',
        'lowStockThreshold',
        'reorderPoint',
        'reorderQuantity',
        'leadTimeDays',
        'supplier',
        'unitOfMeasure',
        'weight',
        'weightUnit',
        'expiryDate',
        'batchNumber',
        'lotNumber',
        'tags',
      ];
      const rows = products.map((product) => {
        const p: any = product;
        const supplierName = p.preferredSupplierId
          ? supplierMap.get(p.preferredSupplierId.toString()) || ''
          : '';
        return [
          p.name || '',
          p.sku || '',
          p.barcode || '',
          p.price ?? 0,
          p.cost ?? 0,
          p.stock ?? 0,
          (p.categoryId ? categoryMap.get(p.categoryId.toString()) : '') || '',
          p.brand || '',
          p.tax ?? 0,
          p.status || 'active',
          p.description || '',
          p.lowStockThreshold ?? '',
          p.reorderPoint ?? '',
          p.reorderQuantity ?? '',
          p.leadTimeDays ?? '',
          supplierName,
          p.unitOfMeasure || '',
          p.weight ?? '',
          p.weightUnit || '',
          p.expiryDate
            ? new Date(p.expiryDate).toISOString().split('T')[0]
            : '',
          p.batchNumber || '',
          p.lotNumber || '',
          Array.isArray(p.tags) ? p.tags.join(';') : '',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const str = String(cell ?? '');
              if (
                str.includes(',') ||
                str.includes('"') ||
                str.includes('\n')
              ) {
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
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=products-export-${new Date().toISOString().split('T')[0]}.csv`,
      );
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
    mutationId?: string,
  ): Promise<StockAdjustmentDocument> {
    const adjustment = new this.adjustmentModel({
      shopId: new Types.ObjectId(shopId),
      productId: new Types.ObjectId(productId),
      quantityChange,
      reason: this.toAdjustmentReason(reason),
      adjustedBy: new Types.ObjectId(adjustedBy),
      notes,
      ...(mutationId ? { mutationId } : {}),
    });

    return adjustment.save();
  }

  /**
   * Map free-form business reasons onto the StockAdjustment reason enum.
   */
  private toAdjustmentReason(reason: string): string {
    const normalized = (reason || '').toLowerCase();
    const allowed = [
      'damage',
      'loss',
      'correction',
      'return',
      'sale',
      'purchase',
      'transfer',
      'other',
    ];
    if (allowed.includes(normalized)) return normalized;
    const mapped: Record<string, string> = {
      received: 'purchase',
      transfer_in: 'transfer',
      transfer_out: 'transfer',
      recount: 'correction',
      expired: 'damage',
      theft: 'loss',
    };
    return mapped[normalized] ?? 'other';
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

  async getExpiringProducts(
    shopId: string,
    daysUntilExpiry = 30,
  ): Promise<ProductDocument[]> {
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

    // If variance exists, apply the physical correction. The mutation carries
    // durable evidence keyed to this reconciliation event; the audit
    // projection happens inside updateStock (exactly one correction record).
    if (variance !== 0) {
      const updated = await this.updateStock(shopId, productId, variance, {
        mutationId: `correction:${reconciliation._id ?? nanoid(16)}`,
        reason: 'correction',
        actor: reconcililedBy,
        referenceType: 'reconciliation',
        notes: `Stock reconciliation: ${notes || ''}`,
      });
      if (!updated) {
        throw new BadRequestException(
          'Failed to apply stock reconciliation variance',
        );
      }
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

    const lowStockProducts = products.filter(
      (p) => (p.stock || 0) <= 10,
    ).length;
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);
    const expiringProducts = products.filter(
      (p) =>
        p.expiryDate &&
        p.expiryDate <= expiringDate &&
        p.expiryDate >= new Date(),
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
  async getBranchStock(
    shopId: string,
    productId: string,
    branchId: string,
  ): Promise<number> {
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
    evidence?: {
      mutationId?: string;
      reason?: string;
      actor?: string;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    },
  ): Promise<ProductDocument | null> {
    // P0-2: branch stock participates in the durable mutation contract. The
    // quantity change and its receipt share one document write; the audit
    // projection and recovery follow the same rules as global stock.
    const mutationId = evidence?.mutationId ?? `mutation:${nanoid(16)}`;
    const reason = evidence?.reason ?? 'other';
    const branchKey = branchId;

    const existing = await this.productModel
      .findOne({
        _id: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!existing) {
      throw new BadRequestException('Product not found');
    }

    // Permanent-witness idempotency: the embedded receipt OR the durable
    // StockAdjustment (which keeps mutationId after receipt cleanup) both
    // prove the mutation already applied — zero additional effect.
    // P0-9: same identity + different intent = conflict, not silent no-op.
    const receipt = (existing.stockMutations ?? []).find(
      (m: any) => m.mutationId === mutationId,
    );
    const audit = receipt
      ? null
      : await this.adjustmentModel
          .findOne({
            shopId: new Types.ObjectId(shopId),
            mutationId,
          })
          .exec();
    this.assertMutationCompatible(
      mutationId,
      quantityChange,
      branchId,
      receipt,
      audit,
      productId,
      reason,
    );
    if (receipt || audit) {
      this.logger.log(
        `Branch stock mutation ${mutationId} already applied for product ${productId} - no additional stock effect`,
      );
      return existing;
    }

    // Fail closed: a reduction may never drive branch stock below zero —
    // no partial movement, no success receipt, no audit.
    const branchStock = existing.branchInventory?.[branchId]?.stock ?? 0;
    if (quantityChange < 0 && branchStock + quantityChange < 0) {
      throw new BadRequestException(
        `Insufficient stock in branch ${branchId}: requested ${-quantityChange}, available ${branchStock}`,
      );
    }

    const updated = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
          'stockMutations.mutationId': { $ne: mutationId },
          [`branchInventory.${branchId}.stock`]: {
            $gte: Math.max(0, -quantityChange),
          },
        },
        {
          $inc: { [`branchInventory.${branchId}.stock`]: quantityChange },
          $push: {
            stockMutations: {
              mutationId,
              quantityDelta: quantityChange,
              reason: evidence?.reason ?? 'other',
              actor: evidence?.actor ?? 'system',
              branchId,
              ...(evidence?.referenceType
                ? { referenceType: evidence.referenceType }
                : {}),
              ...(evidence?.referenceId
                ? { referenceId: evidence.referenceId }
                : {}),
              ...(evidence?.notes ? { notes: evidence.notes } : {}),
              audited: false,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      // Distinguish a lost idempotency race (the winner's receipt landed) from
      // concurrent drift or an uninitialized branch — the latter fail closed.
      const canonical = await this.productModel
        .findOne({
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      const racedReceipt = (canonical?.stockMutations ?? []).find(
        (m: any) => m.mutationId === mutationId,
      );
      if (racedReceipt) {
        this.assertMutationCompatible(
          mutationId,
          quantityChange,
          branchId,
          racedReceipt,
          null,
          productId,
          reason,
        );
        this.logger.log(
          `Branch stock mutation ${mutationId} lost an idempotency race - canonical receipt already present`,
        );
        return canonical;
      }
      throw new BadRequestException(
        `Insufficient stock in branch ${branchId} or branch not initialized`,
      );
    }

    await this.projectStockMutation(shopId, productId, {
      mutationId,
      quantityDelta: quantityChange,
      reason: evidence?.reason ?? 'other',
      actor: evidence?.actor ?? 'system',
      referenceType: evidence?.referenceType,
      referenceId: evidence?.referenceId,
      branchId,
      notes: evidence?.notes,
    });

    return updated;
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
  async getBranchInventoryStats(
    shopId: string,
    branchId: string,
  ): Promise<{
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
    idempotencyKey: string,
  ): Promise<ProductDocument | null> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // P0-8A: a caller-supplied idempotency key is MANDATORY — this endpoint
    // is externally retryable, so an anonymous call could double-move
    // stock. The key becomes the deterministic P0-2 witness.
    if (!idempotencyKey) {
      throw new BadRequestException(
        'idempotencyKey is required for branch stock transfer',
      );
    }
    const mutationId = `transfer:${idempotencyKey}`;
    const receiptExists = (product.stockMutations ?? []).some(
      (m: any) => m.mutationId === mutationId,
    );
    const auditExists = receiptExists
      ? null
      : await this.adjustmentModel
          .findOne({
            shopId: new Types.ObjectId(shopId),
            mutationId,
          })
          .exec();
    if (receiptExists || auditExists) {
      this.logger.log(
        `Branch transfer ${mutationId} already applied for product ${productId} - no additional effect`,
      );
      return product;
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

    // P0-2: the transfer is ONE logical movement with durable evidence —
    // both branch deltas and the mutation receipt share one document write.
    // P0-8: the $ne receipt guard makes a concurrent identical-keyed call
    // lose atomically rather than double-apply.
    const updated = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
          'stockMutations.mutationId': { $ne: mutationId },
          [`branchInventory.${fromBranchId}.stock`]: { $gte: quantity },
        },
        {
          $inc: {
            [`branchInventory.${fromBranchId}.stock`]: -quantity,
            [`branchInventory.${toBranchId}.stock`]: quantity,
          },
          $push: {
            stockMutations: {
              mutationId,
              quantityDelta: -quantity,
              reason: 'transfer',
              actor: transferredBy,
              branchId: fromBranchId,
              notes: `Transfer from ${fromBranchId} to ${toBranchId}`,
              audited: false,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      // Lost an idempotency race — the winner's receipt is durable evidence.
      const canonical = await this.productModel
        .findOne({
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      if (
        (canonical?.stockMutations ?? []).some(
          (m: any) => m.mutationId === mutationId,
        )
      ) {
        return canonical;
      }
      throw new BadRequestException('Failed to apply branch stock transfer');
    }

    await this.projectStockMutation(shopId, productId, {
      mutationId,
      quantityDelta: -quantity,
      reason: 'transfer',
      actor: transferredBy,
      branchId: fromBranchId,
      notes: `Transfer from ${fromBranchId} to ${toBranchId}`,
    });

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
    if (initialStock < 0) {
      throw new BadRequestException('Initial branch stock cannot be negative');
    }

    // P0-9: branch initialization is one atomic witnessed write with a
    // deterministic identity. It may only create the entry — never overwrite
    // existing branch stock. Corrections go through branch stock update or
    // reconciliation.
    const mutationId = `branch-init:${productId}:${branchId}`;

    const existingReceipt = (product.stockMutations ?? []).find(
      (m: any) => m.mutationId === mutationId,
    );
    const existingAudit = existingReceipt
      ? null
      : await this.adjustmentModel
          .findOne({
            shopId: new Types.ObjectId(shopId),
            mutationId,
          })
          .exec();
    this.assertMutationCompatible(
      mutationId,
      initialStock,
      branchId,
      existingReceipt,
      existingAudit,
      productId,
      'other',
    );
    if (existingReceipt || existingAudit) {
      return product;
    }

    // The atomic filter below is the real guard — a concurrent identical
    // initialization must converge, not conflict.
    const updated = await this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
          [`branchInventory.${branchId}`]: { $exists: false },
          'stockMutations.mutationId': { $ne: mutationId },
        },
        {
          $set: { [`branchInventory.${branchId}`]: { stock: initialStock } },
          $push: {
            stockMutations: {
              mutationId,
              quantityDelta: initialStock,
              reason: 'other',
              actor: addedBy ?? 'system',
              branchId,
              notes: `Product added to branch ${branchId}`,
              audited: false,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      // Lost a race — either the winner wrote our identical receipt, or the
      // branch entry was initialized concurrently by another identity.
      const canonical = await this.productModel
        .findOne({
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      const racedReceipt = (canonical?.stockMutations ?? []).find(
        (m: any) => m.mutationId === mutationId,
      );
      if (racedReceipt) {
        this.assertMutationCompatible(
          mutationId,
          initialStock,
          branchId,
          racedReceipt,
          null,
          productId,
          'other',
        );
        return canonical;
      }
      throw new ConflictException(
        `Product already initialized in branch ${branchId} — ` +
          'use a witnessed branch stock adjustment or reconciliation instead',
      );
    }

    await this.projectStockMutation(shopId, productId, {
      mutationId,
      quantityDelta: initialStock,
      reason: 'other',
      actor: addedBy ?? 'system',
      branchId,
      notes: `Product added to branch ${branchId} with initial stock: ${initialStock}`,
    });

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
        await this.addProductToBranch(
          shopId,
          item.productId,
          branchId,
          item.stock,
          addedBy,
        );
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

    const products = await this.productModel.find(query).exec();

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
    const activeProducts = products.filter((p) => p.status === 'active').length;
    const defaultThreshold = 10;
    // Compare each product's stock against its own lowStockThreshold (or default of 10)
    const lowStockProducts = products.filter((p) => {
      const threshold = p.lowStockThreshold ?? defaultThreshold;
      const stock = getStock(p);
      return stock <= threshold && stock > 0;
    }).length;
    const outOfStockProducts = products.filter((p) => getStock(p) === 0).length;

    // Stock value - use branch-specific stock
    const totalStockValue = products.reduce(
      (sum, p) => sum + (p.cost || p.price || 0) * getStock(p),
      0,
    );
    const totalStockUnits = products.reduce((sum, p) => sum + getStock(p), 0);

    // Average stock level
    const averageStockLevel =
      totalProducts > 0 ? Math.round(totalStockUnits / totalProducts) : 0;

    // Low stock items - compare each product against its own threshold using branch stock
    const lowStockItems = products
      .filter((p) => {
        const threshold = p.lowStockThreshold ?? defaultThreshold;
        return getStock(p) <= threshold;
      })
      .sort((a, b) => getStock(a) - getStock(b))
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        stock: getStock(p),
        threshold: p.lowStockThreshold ?? defaultThreshold,
        sku: p.sku || '',
      }));

    // Stock by category - use branch-specific stock
    const categoryMap = new Map<
      string,
      { name: string; count: number; value: number }
    >();
    products.forEach((p) => {
      const catId = p.categoryId?.toString() || 'uncategorized';
      const category = categories.find((c) => c._id.toString() === catId);
      const catName = category?.name || 'Uncategorized';
      const existing = categoryMap.get(catId) || {
        name: catName,
        count: 0,
        value: 0,
      };
      existing.count += 1;
      existing.value += (p.cost || p.price || 0) * getStock(p);
      categoryMap.set(catId, existing);
    });
    const stockByCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((c) => ({
        category: c.name,
        count: c.count,
        value: Math.round(c.value),
      }));

    // --- Query actual sales data from orders in the last 30 days ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const orderQuery: any = {
      shopId: new Types.ObjectId(shopId),
      status: 'completed',
      createdAt: { $gte: thirtyDaysAgo },
    };
    if (branchId) {
      orderQuery.branchId = new Types.ObjectId(branchId);
    }
    const recentOrders = await this.orderModel
      .find(orderQuery)
      .select('items createdAt')
      .lean()
      .exec();

    // Build a map: productId -> { soldQty, lastSaleDate }
    const salesMap = new Map<string, { soldQty: number; lastSaleDate: Date }>();
    recentOrders.forEach((order: any) => {
      const orderDate = new Date(order.createdAt);
      (order.items || []).forEach((item: any) => {
        const pid = item.productId?.toString();
        if (!pid) return;
        const existing = salesMap.get(pid) || {
          soldQty: 0,
          lastSaleDate: new Date(0),
        };
        existing.soldQty += item.quantity || 0;
        if (orderDate > existing.lastSaleDate)
          existing.lastSaleDate = orderDate;
        salesMap.set(pid, existing);
      });
    });

    // Total units sold this month (for turnover rate)
    let totalUnitsSoldThisMonth = 0;
    salesMap.forEach((v) => {
      totalUnitsSoldThisMonth += v.soldQty;
    });

    // Top moving products - sorted by soldQty descending
    const topMovingProducts = products
      .filter((p) => p.status === 'active')
      .map((p) => {
        const pid = p._id.toString();
        const sales = salesMap.get(pid);
        return {
          name: p.name,
          soldQty: sales?.soldQty || 0,
          currentStock: getStock(p),
        };
      })
      .filter((p) => p.soldQty > 0)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 5);

    // Slow moving products - active products with stock but low/no sales
    const now = new Date();
    const slowMovingProducts = products
      .filter((p) => p.status === 'active' && getStock(p) > 0)
      .map((p) => {
        const pid = p._id.toString();
        const sales = salesMap.get(pid);
        const daysSinceLastSale =
          sales?.lastSaleDate && sales.lastSaleDate.getTime() > 0
            ? Math.floor(
                (now.getTime() - sales.lastSaleDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 999;
        return {
          name: p.name,
          soldQty: sales?.soldQty || 0,
          currentStock: getStock(p),
          daysSinceLastSale,
        };
      })
      .sort(
        (a, b) =>
          a.soldQty - b.soldQty || b.daysSinceLastSale - a.daysSinceLastSale,
      )
      .slice(0, 5);

    // Recent stock changes (from adjustments)
    const recentAdjustments = await this.adjustmentModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    // Create a map of product IDs to names for quick lookup
    const productNameMap = new Map<string, string>();
    products.forEach((p) => {
      productNameMap.set(p._id.toString(), p.name);
    });

    const recentStockChanges = recentAdjustments.map((adj) => {
      const doc = adj as any;
      const productId = doc.productId?.toString() || '';
      const productName = productNameMap.get(productId) || 'Unknown Product';
      return {
        product: productName,
        change: adj.quantityChange || 0,
        type:
          (adj.quantityChange || 0) > 0
            ? 'in'
            : adj.reason === 'correction'
              ? 'adjustment'
              : 'out',
        date: doc.createdAt || new Date(),
      };
    });

    // Turnover rate: total units sold / average stock (per month)
    const avgStock = totalStockUnits > 0 ? totalStockUnits : 1;
    const turnoverRate =
      Math.round((totalUnitsSoldThisMonth / avgStock) * 10) / 10;

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
