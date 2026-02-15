import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../inventory/schemas/product.schema';
import { Purchase, PurchaseDocument } from '../purchases/purchase.schema';
import { nanoid } from 'nanoid';

/**
 * PHASE 3: REORDER AUTOMATION
 * 
 * Automatically creates purchase orders when stock falls below reorder point
 * Multi-tenant safe: filters by shopId
 */
@Injectable()
export class ReorderService {
  private readonly logger = new Logger(ReorderService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Purchase.name) private readonly purchaseModel: Model<PurchaseDocument>,
  ) {}

  /**
   * Check products below reorder point and auto-create POs
   * 
   * @param shopId - Shop ID for multi-tenant isolation
   * @param userId - User ID for audit trail
   * @returns Result with count of created POs and any errors
   */
  async checkAndCreatePOs(
    shopId: string,
    userId: string,
  ): Promise<{ created: number; errors: string[]; skipped: number }> {
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    try {
      // Find products below reorder point
      const productsToReorder = await this.productModel
        .find({
          shopId: new Types.ObjectId(shopId),
          status: 'active',
          reorderPoint: { $gt: 0 }, // Must have reorder point set
          $expr: { $lte: ['$stock', '$reorderPoint'] }, // stock <= reorderPoint
        })
        .exec();

      this.logger.log(
        `Found ${productsToReorder.length} products below reorder point for shop ${shopId}`
      );

      for (const product of productsToReorder) {
        try {
          // Check if PO already exists for this product
          const existingPO = await this.purchaseModel.findOne({
            shopId: new Types.ObjectId(shopId),
            'items.productId': product._id,
            status: { $in: ['pending', 'received'] }, // Don't create if already ordered
          });

          if (existingPO) {
            this.logger.log(
              `Skipping ${product.name}: PO already exists (${existingPO.purchaseNumber})`
            );
            skipped++;
            continue;
          }

          // Check if product has preferred supplier
          if (!product.preferredSupplierId) {
            errors.push(
              `${product.name}: No preferred supplier set. Cannot auto-create PO.`
            );
            skipped++;
            continue;
          }

          // Create new PO
          const purchaseNumber = `AUTO-${Date.now()}-${nanoid(6)}`;
          const reorderQty = product.reorderQuantity || 50; // Default to 50 if not set
          const unitCost = product.cost || 0;
          const totalCost = reorderQty * unitCost;

          const po = new this.purchaseModel({
            purchaseNumber,
            supplierId: product.preferredSupplierId,
            shopId: new Types.ObjectId(shopId),
            items: [
              {
                productId: product._id,
                productName: product.name,
                quantity: reorderQty,
                unitCost,
                totalCost,
              },
            ],
            totalCost,
            status: 'pending',
            expectedDeliveryDate: this.calculateExpectedDelivery(
              product.leadTimeDays || 3
            ),
            notes: `Auto-generated reorder: Stock ${product.stock} <= Reorder Point ${product.reorderPoint}`,
            createdBy: new Types.ObjectId(userId),
          });

          await po.save();
          created++;

          this.logger.log(
            `Auto-created PO ${purchaseNumber} for ${product.name}: ${reorderQty} units`
          );
        } catch (error: any) {
          const errorMsg = `Failed to create PO for ${product.name}: ${
            error?.message || 'Unknown error'
          }`;
          errors.push(errorMsg);
          this.logger.error(errorMsg, error);
        }
      }
    } catch (error: any) {
      const errorMsg = `Reorder check failed for shop ${shopId}: ${
        error?.message || 'Unknown error'
      }`;
      this.logger.error(errorMsg, error);
      errors.push(errorMsg);
    }

    return { created, errors, skipped };
  }

  /**
   * Get all products below reorder point
   * 
   * @param shopId - Shop ID for multi-tenant isolation
   * @returns Products that need reordering
   */
  async getLowStockProducts(shopId: string): Promise<ProductDocument[]> {
    return this.productModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
        reorderPoint: { $gt: 0 },
        $expr: { $lte: ['$stock', '$reorderPoint'] },
      })
      .sort({ stock: 1 }) // Lowest stock first
      .exec();
  }

  /**
   * Get reorder status for a product
   * 
   * @param shopId - Shop ID
   * @param productId - Product ID
   * @returns Reorder status with stock info
   */
  async getReorderStatus(
    shopId: string,
    productId: string,
  ): Promise<{
    productId: string;
    name: string;
    currentStock: number;
    reorderPoint: number;
    reorderQuantity: number;
    needsReorder: boolean;
    daysUntilStockout: number;
  } | null> {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      return null;
    }

    const needsReorder = (product.stock || 0) <= (product.reorderPoint || 0);
    const dailyUsage = await this.estimateDailyUsage(shopId, productId);
    const daysUntilStockout =
      dailyUsage > 0
        ? Math.ceil((product.stock || 0) / dailyUsage)
        : 999; // If no usage, assume plenty of time

    return {
      productId: product._id.toString(),
      name: product.name,
      currentStock: product.stock || 0,
      reorderPoint: product.reorderPoint || 0,
      reorderQuantity: product.reorderQuantity || 50,
      needsReorder,
      daysUntilStockout,
    };
  }

  /**
   * Update reorder settings for a product
   * 
   * @param shopId - Shop ID
   * @param productId - Product ID
   * @param settings - Reorder settings to update
   * @returns Updated product
   */
  async updateReorderSettings(
    shopId: string,
    productId: string,
    settings: {
      reorderPoint?: number;
      reorderQuantity?: number;
      preferredSupplierId?: string;
      leadTimeDays?: number;
    },
  ): Promise<ProductDocument | null> {
    const updateData: any = {};

    if (settings.reorderPoint !== undefined) {
      updateData.reorderPoint = Math.max(0, settings.reorderPoint);
    }
    if (settings.reorderQuantity !== undefined) {
      updateData.reorderQuantity = Math.max(0, settings.reorderQuantity);
    }
    if (settings.preferredSupplierId !== undefined) {
      updateData.preferredSupplierId = new Types.ObjectId(
        settings.preferredSupplierId
      );
    }
    if (settings.leadTimeDays !== undefined) {
      updateData.leadTimeDays = Math.max(0, settings.leadTimeDays);
    }

    return this.productModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
        },
        updateData,
        { new: true }
      )
      .exec();
  }

  /**
   * Get reorder statistics for a shop
   * 
   * @param shopId - Shop ID
   * @returns Statistics about reorder status
   */
  async getReorderStats(shopId: string): Promise<{
    totalProducts: number;
    productsWithReorderPoint: number;
    productsNeedingReorder: number;
    averageReorderPoint: number;
    averageReorderQuantity: number;
  }> {
    const products = await this.productModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
      })
      .exec();

    const productsWithReorderPoint = products.filter(
      (p) => (p.reorderPoint || 0) > 0
    );
    const productsNeedingReorder = productsWithReorderPoint.filter(
      (p) => (p.stock || 0) <= (p.reorderPoint || 0)
    );

    const avgReorderPoint =
      productsWithReorderPoint.length > 0
        ? productsWithReorderPoint.reduce(
            (sum, p) => sum + (p.reorderPoint || 0),
            0
          ) / productsWithReorderPoint.length
        : 0;

    const avgReorderQuantity =
      productsWithReorderPoint.length > 0
        ? productsWithReorderPoint.reduce(
            (sum, p) => sum + (p.reorderQuantity || 0),
            0
          ) / productsWithReorderPoint.length
        : 0;

    return {
      totalProducts: products.length,
      productsWithReorderPoint: productsWithReorderPoint.length,
      productsNeedingReorder: productsNeedingReorder.length,
      averageReorderPoint: Math.round(avgReorderPoint * 100) / 100,
      averageReorderQuantity: Math.round(avgReorderQuantity * 100) / 100,
    };
  }

  /**
   * Estimate daily usage for a product based on recent sales
   * 
   * @param shopId - Shop ID
   * @param productId - Product ID
   * @returns Estimated daily usage
   */
  private async estimateDailyUsage(shopId: string, productId: string): Promise<number> {
    // TODO: Implement by querying sales data from last 30 days
    // For now, return 0 (conservative estimate)
    return 0;
  }

  /**
   * Calculate expected delivery date based on lead time
   * 
   * @param leadTimeDays - Lead time in days
   * @returns Expected delivery date
   */
  private calculateExpectedDelivery(leadTimeDays: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + leadTimeDays);
    return date;
  }
}
