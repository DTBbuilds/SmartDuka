import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StockTransfer, StockTransferDocument, TransferItem } from '../schemas/stock-transfer.schema';
import { Branch, BranchDocument } from '../branch.schema';
import { Product, ProductDocument } from '../../inventory/schemas/product.schema';
import { AuditLog, AuditLogDocument } from '../../audit/audit-log.schema';

export interface CreateTransferDto {
  fromBranchId: string;
  toBranchId: string;
  transferType?: 'branch_to_branch' | 'warehouse_to_branch' | 'branch_to_warehouse' | 'emergency';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  reason?: string;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    notes?: string;
  }[];
  expectedDeliveryDate?: Date;
}

export interface UpdateTransferDto {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  reason?: string;
  notes?: string;
  expectedDeliveryDate?: Date;
  trackingNumber?: string;
  carrier?: string;
}

export interface ReceiveItemDto {
  productId: string;
  receivedQuantity: number;
  damagedQuantity?: number;
  notes?: string;
}

@Injectable()
export class StockTransferService {
  private readonly logger = new Logger(StockTransferService.name);

  constructor(
    @InjectModel(StockTransfer.name) private readonly transferModel: Model<StockTransferDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Generate unique transfer number
   */
  private async generateTransferNumber(shopId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Count transfers today for this shop
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const count = await this.transferModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    return `TRF-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Create a new stock transfer request
   */
  async create(
    shopId: string,
    userId: string,
    dto: CreateTransferDto,
  ): Promise<StockTransferDocument> {
    // Handle 'main' virtual branch ID - this represents the main shop
    const isFromMain = dto.fromBranchId === 'main';
    const isToMain = dto.toBranchId === 'main';

    // Validate branches exist and belong to shop
    const [fromBranch, toBranch] = await Promise.all([
      isFromMain
        ? Promise.resolve({ _id: 'main', name: 'Main Store', code: 'MAIN', type: 'main', canTransferStock: true } as any)
        : this.branchModel.findOne({
            _id: new Types.ObjectId(dto.fromBranchId),
            shopId: new Types.ObjectId(shopId),
          }),
      isToMain
        ? Promise.resolve({ _id: 'main', name: 'Main Store', code: 'MAIN', type: 'main' } as any)
        : this.branchModel.findOne({
            _id: new Types.ObjectId(dto.toBranchId),
            shopId: new Types.ObjectId(shopId),
          }),
    ]);

    if (!fromBranch) {
      throw new BadRequestException('Source branch not found');
    }
    if (!toBranch) {
      throw new BadRequestException('Destination branch not found');
    }
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException('Source and destination branches must be different');
    }

    // Check if source branch allows stock transfers
    if (fromBranch.canTransferStock === false) {
      throw new BadRequestException('Source branch does not allow stock transfers');
    }

    // Validate and enrich items
    const enrichedItems: TransferItem[] = [];
    let totalValue = 0;

    for (const item of dto.items) {
      const product = await this.productModel.findOne({
        _id: new Types.ObjectId(item.productId),
        shopId: new Types.ObjectId(shopId),
      });

      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      // Check stock availability at source branch
      // Use branchInventory object or fall back to main stock
      const branchInventory = product.branchInventory?.[dto.fromBranchId];
      const availableStock = branchInventory?.stock ?? product.stock ?? 0;

      if (availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`
        );
      }

      const itemValue = (product.cost || 0) * item.quantity;
      totalValue += itemValue;

      enrichedItems.push({
        productId: new Types.ObjectId(item.productId),
        productName: product.name,
        sku: product.sku || product.barcode || '',
        quantity: item.quantity,
        unitCost: product.cost,
        notes: item.notes,
      });
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber(shopId);

    // Create transfer - handle 'main' virtual branch ID
    const transfer = new this.transferModel({
      shopId: new Types.ObjectId(shopId),
      transferNumber,
      fromBranchId: isFromMain ? null : new Types.ObjectId(dto.fromBranchId),
      fromBranchName: fromBranch.name,
      toBranchId: isToMain ? null : new Types.ObjectId(dto.toBranchId),
      toBranchName: toBranch.name,
      transferType: dto.transferType || (isFromMain || isToMain ? 'main_to_branch' : 'branch_to_branch'),
      items: enrichedItems,
      status: 'pending_approval',
      priority: dto.priority || 'normal',
      reason: dto.reason,
      notes: dto.notes,
      requestedBy: new Types.ObjectId(userId),
      requestedAt: new Date(),
      expectedDeliveryDate: dto.expectedDeliveryDate,
      totalValue,
      isFromMainStore: isFromMain,
      isToMainStore: isToMain,
    });

    const saved = await transfer.save();

    // Audit log - only create if not main branch
    if (!isFromMain) {
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(dto.fromBranchId),
        userId: new Types.ObjectId(userId),
        action: 'create_stock_transfer',
        resource: 'stock_transfer',
        resourceId: saved._id,
        changes: { after: saved.toObject() },
      });
    } else {
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(userId),
        action: 'create_stock_transfer',
        resource: 'stock_transfer',
        resourceId: saved._id,
        changes: { after: saved.toObject() },
      });
    }

    this.logger.log(`Stock transfer ${transferNumber} created: ${fromBranch.name} → ${toBranch.name}`);

    return saved;
  }

  /**
   * Get all transfers for a shop
   */
  async findByShop(
    shopId: string,
    filters?: {
      status?: string;
      fromBranchId?: string;
      toBranchId?: string;
      priority?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: { page?: number; limit?: number },
  ): Promise<{ transfers: StockTransferDocument[]; total: number; page: number; pages: number }> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.fromBranchId) {
      query.fromBranchId = new Types.ObjectId(filters.fromBranchId);
    }
    if (filters?.toBranchId) {
      query.toBranchId = new Types.ObjectId(filters.toBranchId);
    }
    if (filters?.priority) {
      query.priority = filters.priority;
    }
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      this.transferModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transferModel.countDocuments(query),
    ]);

    return {
      transfers,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get transfers for a specific branch (incoming or outgoing)
   */
  async findByBranch(
    shopId: string,
    branchId: string,
    direction: 'incoming' | 'outgoing' | 'all' = 'all',
  ): Promise<StockTransferDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (direction === 'incoming') {
      query.toBranchId = new Types.ObjectId(branchId);
    } else if (direction === 'outgoing') {
      query.fromBranchId = new Types.ObjectId(branchId);
    } else {
      query.$or = [
        { fromBranchId: new Types.ObjectId(branchId) },
        { toBranchId: new Types.ObjectId(branchId) },
      ];
    }

    return this.transferModel.find(query).sort({ createdAt: -1 }).limit(50).exec();
  }

  /**
   * Get single transfer by ID
   */
  async findById(transferId: string, shopId: string): Promise<StockTransferDocument> {
    const transfer = await this.transferModel.findOne({
      _id: new Types.ObjectId(transferId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    return transfer;
  }

  /**
   * Approve a transfer request
   */
  async approve(
    transferId: string,
    shopId: string,
    userId: string,
    notes?: string,
  ): Promise<StockTransferDocument> {
    const transfer = await this.findById(transferId, shopId);

    if (transfer.status !== 'pending_approval') {
      throw new BadRequestException(`Cannot approve transfer with status: ${transfer.status}`);
    }

    transfer.status = 'approved';
    transfer.approvedBy = new Types.ObjectId(userId);
    transfer.approvedAt = new Date();
    transfer.approvalNotes = notes;

    const saved = await transfer.save();

    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(userId),
      action: 'approve_stock_transfer',
      resource: 'stock_transfer',
      resourceId: transfer._id,
      changes: { status: 'approved', approvalNotes: notes },
    });

    this.logger.log(`Stock transfer ${transfer.transferNumber} approved`);

    return saved;
  }

  /**
   * Reject a transfer request
   */
  async reject(
    transferId: string,
    shopId: string,
    userId: string,
    reason: string,
  ): Promise<StockTransferDocument> {
    const transfer = await this.findById(transferId, shopId);

    if (!['pending_approval', 'draft'].includes(transfer.status)) {
      throw new BadRequestException(`Cannot reject transfer with status: ${transfer.status}`);
    }

    transfer.status = 'rejected';
    transfer.rejectedBy = new Types.ObjectId(userId);
    transfer.rejectedAt = new Date();
    transfer.rejectionReason = reason;

    const saved = await transfer.save();

    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(userId),
      action: 'reject_stock_transfer',
      resource: 'stock_transfer',
      resourceId: transfer._id,
      changes: { status: 'rejected', rejectionReason: reason },
    });

    this.logger.log(`Stock transfer ${transfer.transferNumber} rejected`);

    return saved;
  }

  /**
   * Mark transfer as shipped (in transit)
   * This deducts stock from source branch
   */
  async ship(
    transferId: string,
    shopId: string,
    userId: string,
    shippingDetails?: { trackingNumber?: string; carrier?: string },
  ): Promise<StockTransferDocument> {
    const transfer = await this.findById(transferId, shopId);

    if (transfer.status !== 'approved') {
      throw new BadRequestException(`Cannot ship transfer with status: ${transfer.status}`);
    }

    // Deduct stock from source branch (skip branch inventory if from main store)
    for (const item of transfer.items) {
      if (transfer.fromBranchId && !transfer.isFromMainStore) {
        const fromBranchKey = `branchInventory.${transfer.fromBranchId.toString()}.stock`;
        
        // Update branch-specific inventory
        await this.productModel.updateOne(
          { _id: item.productId, shopId: new Types.ObjectId(shopId) },
          { $inc: { [fromBranchKey]: -item.quantity, stock: -item.quantity } },
        );
      } else {
        // Main store - only update main stock
        await this.productModel.updateOne(
          { _id: item.productId, shopId: new Types.ObjectId(shopId) },
          { $inc: { stock: -item.quantity } },
        );
      }
    }

    transfer.status = 'in_transit';
    transfer.shippedAt = new Date();
    transfer.shippedBy = new Types.ObjectId(userId);
    if (shippingDetails?.trackingNumber) {
      transfer.trackingNumber = shippingDetails.trackingNumber;
    }
    if (shippingDetails?.carrier) {
      transfer.carrier = shippingDetails.carrier;
    }

    const saved = await transfer.save();

    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: transfer.fromBranchId,
      userId: new Types.ObjectId(userId),
      action: 'ship_stock_transfer',
      resource: 'stock_transfer',
      resourceId: transfer._id,
      changes: { status: 'in_transit', shippingDetails },
    });

    this.logger.log(`Stock transfer ${transfer.transferNumber} shipped`);

    return saved;
  }

  /**
   * Receive transfer at destination branch
   * This adds stock to destination branch
   */
  async receive(
    transferId: string,
    shopId: string,
    userId: string,
    receivedItems: ReceiveItemDto[],
    notes?: string,
  ): Promise<StockTransferDocument> {
    const transfer = await this.findById(transferId, shopId);

    if (!['in_transit', 'partially_received'].includes(transfer.status)) {
      throw new BadRequestException(`Cannot receive transfer with status: ${transfer.status}`);
    }

    let allReceived = true;

    for (const receivedItem of receivedItems) {
      const transferItem = transfer.items.find(
        i => i.productId.toString() === receivedItem.productId
      );

      if (!transferItem) {
        throw new BadRequestException(`Product ${receivedItem.productId} not in transfer`);
      }

      // Update transfer item
      transferItem.receivedQuantity = (transferItem.receivedQuantity || 0) + receivedItem.receivedQuantity;
      transferItem.damagedQuantity = (transferItem.damagedQuantity || 0) + (receivedItem.damagedQuantity || 0);
      transferItem.receivedAt = new Date();
      if (receivedItem.notes) {
        transferItem.notes = (transferItem.notes || '') + ' | ' + receivedItem.notes;
      }

      // Check if fully received
      if (transferItem.receivedQuantity < transferItem.quantity) {
        allReceived = false;
      }

      // Add stock to destination branch
      const goodQuantity = receivedItem.receivedQuantity - (receivedItem.damagedQuantity || 0);
      
      if (goodQuantity > 0) {
        if (transfer.toBranchId && !transfer.isToMainStore) {
          const toBranchKey = `branchInventory.${transfer.toBranchId.toString()}.stock`;
          
          // Update branch-specific inventory and main stock
          await this.productModel.updateOne(
            { _id: transferItem.productId, shopId: new Types.ObjectId(shopId) },
            { $inc: { [toBranchKey]: goodQuantity, stock: goodQuantity } },
          );
        } else {
          // Main store - only update main stock
          await this.productModel.updateOne(
            { _id: transferItem.productId, shopId: new Types.ObjectId(shopId) },
            { $inc: { stock: goodQuantity } },
          );
        }
      }
    }

    transfer.status = allReceived ? 'received' : 'partially_received';
    transfer.receivedAt = new Date();
    transfer.receivedBy = new Types.ObjectId(userId);
    transfer.receiptNotes = notes;

    const saved = await transfer.save();

    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      branchId: transfer.toBranchId,
      userId: new Types.ObjectId(userId),
      action: 'receive_stock_transfer',
      resource: 'stock_transfer',
      resourceId: transfer._id,
      changes: { status: saved.status, receivedItems },
    });

    this.logger.log(`Stock transfer ${transfer.transferNumber} ${saved.status}`);

    return saved;
  }

  /**
   * Cancel a transfer
   */
  async cancel(
    transferId: string,
    shopId: string,
    userId: string,
    reason: string,
  ): Promise<StockTransferDocument> {
    const transfer = await this.findById(transferId, shopId);

    if (['received', 'cancelled'].includes(transfer.status)) {
      throw new BadRequestException(`Cannot cancel transfer with status: ${transfer.status}`);
    }

    // If already shipped, need to return stock to source
    if (transfer.status === 'in_transit') {
      for (const item of transfer.items) {
        if (transfer.fromBranchId && !transfer.isFromMainStore) {
          const fromBranchKey = `branchInventory.${transfer.fromBranchId.toString()}.stock`;
          
          // Return stock to source branch
          await this.productModel.updateOne(
            { _id: item.productId, shopId: new Types.ObjectId(shopId) },
            { $inc: { [fromBranchKey]: item.quantity, stock: item.quantity } },
          );
        } else {
          // Main store - only update main stock
          await this.productModel.updateOne(
            { _id: item.productId, shopId: new Types.ObjectId(shopId) },
            { $inc: { stock: item.quantity } },
          );
        }
      }
    }

    transfer.status = 'cancelled';
    transfer.cancelledBy = new Types.ObjectId(userId);
    transfer.cancelledAt = new Date();
    transfer.cancellationReason = reason;

    const saved = await transfer.save();

    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(userId),
      action: 'cancel_stock_transfer',
      resource: 'stock_transfer',
      resourceId: transfer._id,
      changes: { status: 'cancelled', cancellationReason: reason },
    });

    this.logger.log(`Stock transfer ${transfer.transferNumber} cancelled`);

    return saved;
  }

  /**
   * Get transfer statistics for a shop
   */
  async getStats(shopId: string, branchId?: string): Promise<{
    pending: number;
    inTransit: number;
    received: number;
    cancelled: number;
    totalValue: number;
    thisMonth: number;
  }> {
    const baseQuery: any = { shopId: new Types.ObjectId(shopId) };
    
    if (branchId) {
      baseQuery.$or = [
        { fromBranchId: new Types.ObjectId(branchId) },
        { toBranchId: new Types.ObjectId(branchId) },
      ];
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [pending, inTransit, received, cancelled, valueAgg, thisMonth] = await Promise.all([
      this.transferModel.countDocuments({ ...baseQuery, status: 'pending_approval' }),
      this.transferModel.countDocuments({ ...baseQuery, status: 'in_transit' }),
      this.transferModel.countDocuments({ ...baseQuery, status: 'received' }),
      this.transferModel.countDocuments({ ...baseQuery, status: 'cancelled' }),
      this.transferModel.aggregate([
        { $match: { ...baseQuery, status: 'received' } },
        { $group: { _id: null, total: { $sum: '$totalValue' } } },
      ]),
      this.transferModel.countDocuments({
        ...baseQuery,
        createdAt: { $gte: startOfMonth },
      }),
    ]);

    return {
      pending,
      inTransit,
      received,
      cancelled,
      totalValue: valueAgg[0]?.total || 0,
      thisMonth,
    };
  }
}
