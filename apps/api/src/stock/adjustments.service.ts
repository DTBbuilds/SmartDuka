import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Adjustment, AdjustmentDocument } from './adjustment.schema';
import { Product, ProductDocument } from '../inventory/schemas/product.schema';
import { InventoryService } from '../inventory/inventory.service';

export interface CreateAdjustmentDto {
  productId: string;
  productName: string;
  delta: number;
  reason:
    | 'damage'
    | 'loss'
    | 'recount'
    | 'return'
    | 'correction'
    | 'received'
    | 'transfer_in'
    | 'transfer_out'
    | 'expired'
    | 'theft'
    | 'other';
  description?: string;
  reference?: string;
  /**
   * P0-9: client-supplied stable identity for this logical adjustment.
   * Required — a retry of the same operation must carry the same key so the
   * physical mutation and the Adjustment projection each land exactly once.
   */
  idempotencyKey?: string;
}

/**
 * Stock Adjustments Service
 *
 * Handles stock adjustments with proper audit trail and atomic updates.
 *
 * Best Practices Implemented:
 * 1. Atomic transaction: Product stock and adjustment record updated together
 * 2. Audit trail: Every adjustment is logged with who, when, why, and how much
 * 3. Validation: Prevents negative stock (configurable)
 * 4. Previous stock tracking: Records stock before adjustment for reconciliation
 */
@Injectable()
export class AdjustmentsService {
  private readonly logger = new Logger(AdjustmentsService.name);

  constructor(
    @InjectModel(Adjustment.name)
    private readonly adjustmentModel: Model<AdjustmentDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Map adjustment-service reasons onto the canonical StockAdjustment enum.
   */
  private mapReason(reason: string): string {
    const mapped: Record<string, string> = {
      damage: 'damage',
      loss: 'loss',
      recount: 'correction',
      return: 'return',
      correction: 'correction',
      received: 'purchase',
      transfer_in: 'transfer',
      transfer_out: 'transfer',
      expired: 'damage',
      theft: 'loss',
    };
    return mapped[reason] ?? 'other';
  }

  /**
   * Create a stock adjustment and update product stock atomically
   *
   * @param shopId - Shop ID for multi-tenant isolation
   * @param userId - User making the adjustment (for audit trail)
   * @param dto - Adjustment details
   * @returns Created adjustment document
   */
  async create(
    shopId: string,
    userId: string,
    dto: CreateAdjustmentDto,
  ): Promise<AdjustmentDocument> {
    // Validate product exists and belongs to shop
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(dto.productId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!product) {
      throw new NotFoundException(`Product not found: ${dto.productId}`);
    }

    const previousStock = product.stock || 0;
    const newStock = previousStock + dto.delta;

    // P0-9: one logical adjustment = one immutable client-supplied identity.
    // Without it a retry would mint a fresh mutation and double-apply.
    if (!dto.idempotencyKey) {
      throw new BadRequestException(
        'idempotencyKey is required — the client must supply a stable key so a retried adjustment cannot double-apply',
      );
    }

    // Prevent negative stock (optional - can be made configurable)
    if (newStock < 0) {
      throw new BadRequestException(
        `Cannot reduce stock below zero. Current stock: ${previousStock}, Adjustment: ${dto.delta}`,
      );
    }

    // P0-2: the physical mutation goes through the canonical durable-mutation
    // contract (atomic $inc + receipt + StockAdjustment projection) so this
    // parallel service cannot bypass the invariant.
    const mutationId = `stock-adjustment:${dto.idempotencyKey}`;
    const updatedProduct = await this.inventoryService.updateStock(
      shopId,
      dto.productId,
      dto.delta,
      {
        mutationId,
        reason: this.mapReason(dto.reason),
        actor: userId,
        notes:
          [dto.description, dto.reference ? `Ref: ${dto.reference}` : null]
            .filter(Boolean)
            .join(' | ') || undefined,
      },
    );

    if (!updatedProduct) {
      throw new BadRequestException('Failed to update product stock');
    }

    // Additional domain-specific audit record (parallel projection), carrying
    // the same mutation identity. Upsert keyed on (shopId, mutationId): a
    // retry after a crash between the stock mutation and this write recovers
    // exactly one Adjustment row — never a duplicate.
    const savedAdjustment = await this.adjustmentModel
      .findOneAndUpdate(
        {
          shopId: new Types.ObjectId(shopId),
          mutationId,
        },
        {
          $setOnInsert: {
            productId: new Types.ObjectId(dto.productId),
            productName: dto.productName || product.name,
            delta: dto.delta,
            reason: dto.reason,
            description: dto.description,
            reference: dto.reference,
            shopId: new Types.ObjectId(shopId),
            adjustedBy: new Types.ObjectId(userId),
            previousStock, // Track previous stock for reconciliation
            newStock: updatedProduct.stock,
            mutationId,
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    this.logger.log(
      `Stock adjustment: ${product.name} ${dto.delta > 0 ? '+' : ''}${dto.delta} (${dto.reason}) | ` +
        `Previous: ${previousStock} → New: ${updatedProduct.stock} | ` +
        `By: ${userId} | Ref: ${dto.reference || 'N/A'} | mutationId: ${mutationId}`,
    );

    return savedAdjustment;
  }

  async findAll(shopId: string): Promise<AdjustmentDocument[]> {
    const adjustments = await this.adjustmentModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .exec();

    // Populate product names for adjustments that might not have them
    const productIds = [
      ...new Set(adjustments.map((a) => a.productId.toString())),
    ];
    const products = await this.productModel
      .find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } })
      .select('_id name')
      .exec();

    const productMap = new Map(products.map((p) => [p._id.toString(), p.name]));

    // Enrich adjustments with product names
    return adjustments.map((adj) => {
      const adjObj = adj.toObject();
      if (
        !adjObj.productName ||
        adjObj.productName === adjObj.productId?.toString()
      ) {
        adjObj.productName =
          productMap.get(adjObj.productId?.toString()) || 'Unknown Product';
      }
      return adjObj as AdjustmentDocument;
    });
  }

  async findByProduct(
    productId: string,
    shopId: string,
  ): Promise<AdjustmentDocument[]> {
    return this.adjustmentModel
      .find({
        productId: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByReason(
    reason: string,
    shopId: string,
  ): Promise<AdjustmentDocument[]> {
    return this.adjustmentModel
      .find({
        reason,
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAdjustmentSummary(shopId: string): Promise<{
    totalAdjustments: number;
    byReason: Record<string, number>;
    netAdjustment: number;
  }> {
    const adjustments = await this.adjustmentModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    const byReason: Record<string, number> = {};
    let netAdjustment = 0;

    adjustments.forEach((adj) => {
      byReason[adj.reason] = (byReason[adj.reason] || 0) + adj.delta;
      netAdjustment += adj.delta;
    });

    return {
      totalAdjustments: adjustments.length,
      byReason,
      netAdjustment,
    };
  }

  async getRecentAdjustments(
    shopId: string,
    days: number = 7,
  ): Promise<AdjustmentDocument[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.adjustmentModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startDate },
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
