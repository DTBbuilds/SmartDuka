import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Category, CategoryDocument } from './schemas/category.schema';
import { StockAdjustment, StockAdjustmentDocument } from './schemas/stock-adjustment.schema';
import { StockReconciliation, StockReconciliationDocument } from './schemas/stock-reconciliation.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(StockAdjustment.name) private readonly adjustmentModel: Model<StockAdjustmentDocument>,
    @InjectModel(StockReconciliation.name) private readonly reconciliationModel: Model<StockReconciliationDocument>,
  ) {}

  async createProduct(shopId: string, dto: CreateProductDto): Promise<ProductDocument> {
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
    return created.save();
  }

  async getProductById(shopId: string, productId: string): Promise<ProductDocument | null> {
    return this.productModel
      .findOne({
        _id: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
  }

  async listProducts(shopId: string, q: QueryProductsDto): Promise<ProductDocument[]> {
    const filter: FilterQuery<ProductDocument> = {
      shopId: new Types.ObjectId(shopId),
    };
    if (q.q) {
      filter.name = { $regex: q.q, $options: 'i' } as any;
    }
    if (q.categoryId) {
      filter.categoryId = new Types.ObjectId(q.categoryId);
    }
    // Only filter by status if explicitly provided, otherwise show all products
    if (q.status) {
      filter.status = q.status;
    }
    return this.productModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(Math.min(q.limit ?? 50, 200))
      .exec();
  }

  async listCategories(shopId: string): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ order: 1, name: 1 })
      .exec();
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
    return this.productModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(productId), shopId: new Types.ObjectId(shopId) },
        { $inc: { stock: quantityChange } },
        { new: true }
      )
      .exec();
  }

  async getLowStockProducts(shopId: string, threshold = 10): Promise<ProductDocument[]> {
    return this.productModel
      .find({
        shopId: new Types.ObjectId(shopId),
        stock: { $lte: threshold },
        status: 'active',
      })
      .sort({ stock: 1 })
      .exec();
  }

  async importProducts(shopId: string, products: CreateProductDto[]): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < products.length; i++) {
      try {
        const dto = products[i];
        if (!dto.name || !dto.price) {
          errors.push(`Row ${i + 1}: Missing required fields (name, price)`);
          continue;
        }

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
        await created.save();
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err?.message || 'Failed to import'}`);
      }
    }

    return { imported, errors };
  }

  async exportProducts(shopId: string, res: any, categoryId?: string): Promise<void> {
    const filter: any = { shopId: new Types.ObjectId(shopId) };
    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }
    const products = await this.productModel.find(filter).exec();
    
    const headers = ['name', 'sku', 'barcode', 'price', 'cost', 'stock', 'categoryId', 'tax', 'status'];
    const rows = products.map((product) => [
      product.name,
      product.sku || '',
      product.barcode || '',
      product.price,
      product.cost || 0,
      product.stock || 0,
      product.categoryId?.toString() || '',
      product.tax || 0,
      product.status || 'active',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(','),
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csvContent);
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
      throw new Error('Product not found');
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
}
