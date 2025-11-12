import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Purchase, PurchaseDocument, PurchaseItem } from './purchase.schema';
import { nanoid } from 'nanoid';
import { InventoryService } from '../inventory/inventory.service';

export interface CreatePurchaseDto {
  supplierId: string;
  branchId?: string; // PHASE 5: Branch support
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }>;
  expectedDeliveryDate?: Date;
  invoiceNumber?: string;
  notes?: string;
}

export interface UpdatePurchaseDto {
  status?: 'pending' | 'received' | 'cancelled';
  receivedDate?: Date;
  invoiceNumber?: string;
  notes?: string;
}

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectModel(Purchase.name) private readonly purchaseModel: Model<PurchaseDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(shopId: string, userId: string, dto: CreatePurchaseDto): Promise<PurchaseDocument> {
    const items: PurchaseItem[] = dto.items.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.quantity * item.unitCost,
    }));

    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    const purchaseNumber = `PO-${Date.now()}-${nanoid(6)}`;

    const purchase = new this.purchaseModel({
      purchaseNumber,
      supplierId: new Types.ObjectId(dto.supplierId),
      shopId: new Types.ObjectId(shopId),
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined, // PHASE 5
      items,
      totalCost,
      status: 'pending',
      expectedDeliveryDate: dto.expectedDeliveryDate,
      invoiceNumber: dto.invoiceNumber,
      notes: dto.notes,
      createdBy: new Types.ObjectId(userId),
    });

    return purchase.save();
  }

  async findAll(shopId: string): Promise<PurchaseDocument[]> {
    return this.purchaseModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .populate('supplierId', 'name phone email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(purchaseId: string, shopId: string): Promise<PurchaseDocument | null> {
    return this.purchaseModel
      .findOne({
        _id: new Types.ObjectId(purchaseId),
        shopId: new Types.ObjectId(shopId),
      })
      .populate('supplierId', 'name phone email address')
      .exec();
  }

  /**
   * PHASE 2: PO TO INVENTORY INTEGRATION
   * 
   * When PO status changes to 'received', increase inventory
   * Multi-tenant safe: filters by shopId
   */
  async update(
    purchaseId: string,
    shopId: string,
    dto: UpdatePurchaseDto,
    userId?: string,
  ): Promise<PurchaseDocument | null> {
    // Get current purchase to check status change
    const currentPurchase = await this.purchaseModel.findOne({
      _id: new Types.ObjectId(purchaseId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!currentPurchase) {
      throw new BadRequestException('Purchase order not found');
    }

    // PHASE 5: If status changing to 'received', increase inventory (branch-aware)
    if (dto.status === 'received' && currentPurchase.status !== 'received') {
      const stockIncreaseErrors: string[] = [];

      for (const item of currentPurchase.items) {
        try {
          // PHASE 5: If branchId exists, update branch stock; otherwise update shared stock
          let updatedProduct;
          if (currentPurchase.branchId) {
            updatedProduct = await this.inventoryService.updateBranchStock(
              shopId,
              item.productId.toString(),
              currentPurchase.branchId.toString(),
              item.quantity // Positive = increase
            );
          } else {
            updatedProduct = await this.inventoryService.updateStock(
              shopId,
              item.productId.toString(),
              item.quantity // Positive = increase
            );
          }

          if (!updatedProduct) {
            stockIncreaseErrors.push(
              `Product ${item.productId} not found in shop ${shopId}`
            );
            continue;
          }

          // Log stock adjustment for audit trail
          await this.inventoryService.createStockAdjustment(
            shopId,
            item.productId.toString(),
            item.quantity,
            'purchase_received', // reason
            userId || 'system',
            `Purchase Order ${currentPurchase.purchaseNumber} - ${item.productName} x${item.quantity}` // notes
          );

          this.logger.log(
            `Stock increased for ${item.productName}: +${item.quantity} (PO: ${currentPurchase.purchaseNumber})`
          );
        } catch (error: any) {
          stockIncreaseErrors.push(
            `Failed to increase stock for ${item.productName}: ${error?.message || 'Unknown error'}`
          );
          this.logger.error(
            `Stock increase error for ${item.productName}:`,
            error
          );
        }
      }

      // Handle partial failures
      if (stockIncreaseErrors.length > 0) {
        this.logger.error(
          `Stock increase errors for PO ${currentPurchase.purchaseNumber}:`,
          stockIncreaseErrors
        );
        
        // Add warning to notes
        dto.notes = (dto.notes || '') + 
          `\n⚠️ INVENTORY SYNC WARNING: ${stockIncreaseErrors.join('; ')}`;
      }
    }

    // Update purchase order
    const updated = await this.purchaseModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(purchaseId),
          shopId: new Types.ObjectId(shopId),
        },
        { ...dto, updatedAt: new Date() },
        { new: true },
      )
      .populate('supplierId', 'name phone email')
      .exec();

    return updated;
  }

  async delete(purchaseId: string, shopId: string): Promise<boolean> {
    const result = await this.purchaseModel
      .deleteOne({
        _id: new Types.ObjectId(purchaseId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    return result.deletedCount > 0;
  }

  async getPending(shopId: string): Promise<PurchaseDocument[]> {
    return this.purchaseModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'pending',
      })
      .populate('supplierId', 'name phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getBySupplier(supplierId: string, shopId: string): Promise<PurchaseDocument[]> {
    return this.purchaseModel
      .find({
        supplierId: new Types.ObjectId(supplierId),
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // PHASE 5: Branch-specific purchase methods

  /**
   * Get all purchases for branch
   * Multi-tenant safe: filters by shopId and branchId
   */
  async findByBranch(shopId: string, branchId: string): Promise<PurchaseDocument[]> {
    return this.purchaseModel
      .find({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
      })
      .populate('supplierId', 'name phone email')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get pending purchases for branch
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getPendingByBranch(shopId: string, branchId: string): Promise<PurchaseDocument[]> {
    return this.purchaseModel
      .find({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
        status: 'pending',
      })
      .populate('supplierId', 'name phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get received purchases for branch
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getReceivedByBranch(shopId: string, branchId: string): Promise<PurchaseDocument[]> {
    return this.purchaseModel
      .find({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
        status: 'received',
      })
      .populate('supplierId', 'name phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get branch purchase stats
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getBranchStats(shopId: string, branchId: string): Promise<{
    totalPurchases: number;
    pendingPurchases: number;
    receivedPurchases: number;
    totalSpent: number;
  }> {
    const purchases = await this.purchaseModel
      .find({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
      })
      .exec();

    const pending = purchases.filter(p => p.status === 'pending').length;
    const received = purchases.filter(p => p.status === 'received').length;
    const totalSpent = purchases.reduce((sum, p) => sum + p.totalCost, 0);

    return {
      totalPurchases: purchases.length,
      pendingPurchases: pending,
      receivedPurchases: received,
      totalSpent,
    };
  }
}
