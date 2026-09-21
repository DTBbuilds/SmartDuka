import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  StockTransfer,
  StockTransferDocument,
  TransferItem,
} from '../schemas/stock-transfer.schema';
import { Branch, BranchDocument } from '../branch.schema';
import {
  Product,
  ProductDocument,
} from '../../inventory/schemas/product.schema';
import { AuditLog, AuditLogDocument } from '../../audit/audit-log.schema';
import { InventoryService } from '../../inventory/inventory.service';

export interface CreateTransferDto {
  fromBranchId: string;
  toBranchId: string;
  transferType?:
    | 'branch_to_branch'
    | 'warehouse_to_branch'
    | 'branch_to_warehouse'
    | 'emergency';
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
    @InjectModel(StockTransfer.name)
    private readonly transferModel: Model<StockTransferDocument>,
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * P0-8: every physical transfer mutation routes through the P0-2 durable
   * stock contract — never a raw $inc. `null` branchId means the main store
   * (global `stock`), matching the established ownership model.
   */
  private async convergeStock(
    transfer: StockTransferDocument,
    shopId: string,
    productId: string,
    branchId: string | null,
    quantityDelta: number,
    mutationId: string,
    userId: string,
    notes: string,
  ): Promise<ProductDocument | null> {
    const evidence = {
      mutationId,
      reason: 'transfer',
      actor: userId || 'system',
      referenceType: 'transfer',
      referenceId: transfer._id?.toString(),
      notes,
    };
    return branchId
      ? this.inventoryService.updateBranchStock(
          shopId,
          productId,
          branchId,
          quantityDelta,
          evidence,
        )
      : this.inventoryService.updateStock(
          shopId,
          productId,
          quantityDelta,
          evidence,
        );
  }

  /** Deterministic per-line mutation identity (`:line:<idx>` on duplicate products). */
  private lineMutationId(
    transfer: StockTransferDocument,
    item: TransferItem,
    idx: number,
    occurrences: Map<string, number>,
    suffix: string,
  ): string {
    const pid = item.productId.toString();
    const base = (occurrences.get(pid) ?? 0) > 1 ? `${pid}:line:${idx}` : pid;
    return `transfer:${transfer._id?.toString()}:${base}:${suffix}`;
  }

  private countProductOccurrences(items: TransferItem[]): Map<string, number> {
    const occurrences = new Map<string, number>();
    for (const item of items) {
      const pid = item.productId.toString();
      occurrences.set(pid, (occurrences.get(pid) ?? 0) + 1);
    }
    return occurrences;
  }

  private async reread(
    transfer: StockTransferDocument,
  ): Promise<StockTransferDocument | null> {
    return this.transferModel
      .findOne({ _id: transfer._id, shopId: transfer.shopId })
      .exec();
  }

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
        ? Promise.resolve({
            _id: 'main',
            name: 'Main Store',
            code: 'MAIN',
            type: 'main',
            canTransferStock: true,
          } as any)
        : this.branchModel.findOne({
            _id: new Types.ObjectId(dto.fromBranchId),
            shopId: new Types.ObjectId(shopId),
          }),
      isToMain
        ? Promise.resolve({
            _id: 'main',
            name: 'Main Store',
            code: 'MAIN',
            type: 'main',
          } as any)
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
      throw new BadRequestException(
        'Source and destination branches must be different',
      );
    }

    // Check if source branch allows stock transfers
    if (fromBranch.canTransferStock === false) {
      throw new BadRequestException(
        'Source branch does not allow stock transfers',
      );
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
          `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`,
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
      transferType:
        dto.transferType ||
        (isFromMain || isToMain ? 'main_to_branch' : 'branch_to_branch'),
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

    this.logger.log(
      `Stock transfer ${transferNumber} created: ${fromBranch.name} → ${toBranch.name}`,
    );

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
  ): Promise<{
    transfers: StockTransferDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
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

    return this.transferModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  /**
   * Get single transfer by ID
   */
  async findById(
    transferId: string,
    shopId: string,
  ): Promise<StockTransferDocument> {
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
      throw new BadRequestException(
        `Cannot approve transfer with status: ${transfer.status}`,
      );
    }

    // Atomic conditional claim — a concurrent approve/reject/cancel cannot
    // slip between the check and the write.
    const saved = await this.transferModel
      .findOneAndUpdate(
        {
          _id: transfer._id,
          shopId: transfer.shopId,
          status: 'pending_approval',
        },
        {
          $set: {
            status: 'approved',
            approvedBy: new Types.ObjectId(userId),
            approvedAt: new Date(),
            approvalNotes: notes,
          },
        },
        { new: true },
      )
      .exec();

    if (!saved) {
      const latest = await this.reread(transfer);
      throw new ConflictException(
        `Transfer status changed concurrently (now '${latest?.status ?? 'gone'}')`,
      );
    }

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
      throw new BadRequestException(
        `Cannot reject transfer with status: ${transfer.status}`,
      );
    }

    const saved = await this.transferModel
      .findOneAndUpdate(
        {
          _id: transfer._id,
          shopId: transfer.shopId,
          status: { $in: ['pending_approval', 'draft'] },
        },
        {
          $set: {
            status: 'rejected',
            rejectedBy: new Types.ObjectId(userId),
            rejectedAt: new Date(),
            rejectionReason: reason,
          },
        },
        { new: true },
      )
      .exec();

    if (!saved) {
      const latest = await this.reread(transfer);
      throw new ConflictException(
        `Transfer status changed concurrently (now '${latest?.status ?? 'gone'}')`,
      );
    }

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
   * Deducts stock from source — P0-8: via a durable ship claim while status
   * stays 'approved', then converges every source deduction through the
   * P0-2 durable stock contract, then finalizes approved→in_transit.
   * in_transit therefore PROVES every source deduction landed. A crash
   * leaves approved+shipClaimId (resumable), never a false in_transit.
   * NOTE: For branch-to-branch transfers we only modify branchInventory,
   * NOT main stock. Main stock is only modified when transferring
   * to/from the main store.
   */
  async ship(
    transferId: string,
    shopId: string,
    userId: string,
    shippingDetails?: { trackingNumber?: string; carrier?: string },
  ): Promise<StockTransferDocument> {
    let transfer = await this.findById(transferId, shopId);
    const claimId = `transfer:${transferId}:ship`;

    if (transfer.status === 'approved') {
      // Durable ship claim — atomic; blocks cancel on 'approved' while the
      // deductions converge.
      const claimed = await this.transferModel
        .findOneAndUpdate(
          {
            _id: transfer._id,
            shopId: transfer.shopId,
            status: 'approved',
            shipClaimId: null,
            cancelClaimId: null,
          },
          {
            $set: {
              shipClaimId: claimId,
              shipStartedAt: new Date(),
              shipClaimedBy: new Types.ObjectId(userId),
            },
          },
          { new: true },
        )
        .exec();

      if (!claimed) {
        const latest = await this.reread(transfer);
        if (!latest) {
          throw new NotFoundException('Stock transfer not found');
        }
        if (
          latest.status === 'in_transit' ||
          (latest.status === 'approved' && latest.shipClaimId === claimId)
        ) {
          // Already finalized, or the canonical ship claim is active — resume.
          transfer = latest;
        } else {
          throw new ConflictException(
            `Transfer status changed concurrently (now '${latest.status}')`,
          );
        }
      } else {
        transfer = claimed;
      }
    } else if (transfer.status !== 'in_transit') {
      throw new BadRequestException(
        `Cannot ship transfer with status: ${transfer.status}`,
      );
    }

    // ── Converge source deductions — exactly once per line via P0-2 ────
    const occurrences = this.countProductOccurrences(transfer.items);
    for (const [idx, item] of transfer.items.entries()) {
      if (item.quantity <= 0) continue;
      const mutationId = this.lineMutationId(
        transfer,
        item,
        idx,
        occurrences,
        'ship',
      );
      await this.convergeStock(
        transfer,
        shopId,
        item.productId.toString(),
        transfer.isFromMainStore
          ? null
          : (transfer.fromBranchId?.toString() ?? null),
        -item.quantity,
        mutationId,
        userId,
        `Transfer ${transfer.transferNumber} shipped: ${item.productName} x${item.quantity}`,
      );
    }

    // ── Finalize — the claim owner flips approved→in_transit only after
    // every source deduction is durably proven applied.
    let shipFinalized = false;
    if (transfer.status !== 'in_transit') {
      const finalized = await this.transferModel
        .findOneAndUpdate(
          {
            _id: transfer._id,
            shopId: transfer.shopId,
            status: 'approved',
            shipClaimId: claimId,
          },
          {
            $set: {
              status: 'in_transit',
              shippedAt: new Date(),
              shippedBy: new Types.ObjectId(userId),
              ...(shippingDetails?.trackingNumber
                ? { trackingNumber: shippingDetails.trackingNumber }
                : {}),
              ...(shippingDetails?.carrier
                ? { carrier: shippingDetails.carrier }
                : {}),
            },
          },
          { new: true },
        )
        .exec();

      if (!finalized) {
        const latest = await this.reread(transfer);
        if (!latest) {
          throw new NotFoundException('Stock transfer not found');
        }
        if (latest.status === 'in_transit') {
          transfer = latest;
        } else {
          throw new ConflictException(
            `Transfer status changed concurrently (now '${latest.status}')`,
          );
        }
      } else {
        transfer = finalized;
        shipFinalized = true;
      }
    }

    const saved = transfer;

    // One logical dispatch = one history row. Retries/recovery that lose
    // the finalize race (or replay after it) must not write a second
    // ship_stock_transfer entry.
    if (shipFinalized) {
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        branchId: transfer.fromBranchId,
        userId: new Types.ObjectId(userId),
        action: 'ship_stock_transfer',
        resource: 'stock_transfer',
        resourceId: transfer._id,
        changes: { status: 'in_transit', shippingDetails },
      });
    }

    this.logger.log(`Stock transfer ${transfer.transferNumber} shipped`);

    return saved;
  }

  /**
   * Receive transfer at destination branch — P0-8 hardened.
   *
   * Each receive REQUEST is a durable receipt event (`receiptEventId`, or a
   * generated id when the caller doesn't supply one). Per line:
   *   1. ATOMIC bound-claim — a single conditional update requiring
   *      status in {in_transit, partially_received}, no active cancel
   *      claim, receivedQuantity <= quantity - request, and the event not
   *      already claimed. Two concurrent receives cannot both satisfy the
   *      bound — over-receipt is impossible at the DB level.
   *   2. Stock converge — destination +goodQty via P0-2 with a
   *      deterministic witness `transfer:<id>:<pid>:receive:<eventId>`.
   * A crash after a bound-claim leaves the event claimed on the line —
   * a retry with the same eventId skips the claim and converges stock.
   */
  async receive(
    transferId: string,
    shopId: string,
    userId: string,
    receivedItems: ReceiveItemDto[],
    notes?: string,
    receiptEventId?: string,
  ): Promise<StockTransferDocument> {
    if (!receiptEventId) {
      // P0-8A: a silent server-generated id would give every retry a fresh
      // logical identity — the dedupe below would never engage. The client
      // MUST supply a stable id for the whole logical receipt.
      throw new BadRequestException(
        'receiptEventId is required — the client must supply a stable event id so retries dedupe',
      );
    }

    let transfer = await this.findById(transferId, shopId);

    // 'received' is terminal, but a retry of the SAME event is allowed
    // through to converge/mark any line that crashed post-claim — its
    // bound-claim will no-op and the resume branch below handles it.
    if (
      !['in_transit', 'partially_received', 'received'].includes(
        transfer.status,
      )
    ) {
      throw new BadRequestException(
        `Cannot receive transfer with status: ${transfer.status}`,
      );
    }
    if (transfer.cancelClaimId) {
      throw new ConflictException(
        'A cancellation is in progress for this transfer - it cannot be received',
      );
    }
    if (!receivedItems?.length) {
      throw new BadRequestException(
        'receivedItems must contain at least one item',
      );
    }

    const eventId = receiptEventId;
    const occurrences = this.countProductOccurrences(transfer.items);
    let markedAny = false;

    for (const receivedItem of receivedItems) {
      const reqQty = receivedItem.receivedQuantity ?? 0;
      const damQty = receivedItem.damagedQuantity ?? 0;
      if (reqQty < 0 || damQty < 0 || damQty > reqQty) {
        throw new BadRequestException(
          'receivedQuantity and damagedQuantity must be >= 0 with damaged <= received',
        );
      }

      const lineIdx = transfer.items.findIndex(
        (i) => i.productId.toString() === receivedItem.productId,
      );
      const transferItem = transfer.items[lineIdx];

      if (!transferItem) {
        throw new BadRequestException(
          `Product ${receivedItem.productId} not in transfer`,
        );
      }
      if (reqQty === 0) {
        continue;
      }

      // ── ATOMIC BOUND-CLAIM — one conditional write enforces
      // receivedQuantity + request <= quantity, requires no active cancel
      // claim, dedupes the event, and records the in-flight receipt
      // (pendingReceipts) in the same mutation. Positional `items.<idx>`
      // paths pin the exact line — $elemMatch-by-productId could target a
      // different duplicate-product line than the one we found. The $or
      // covers lines whose receivedQuantity field is absent (never
      // received) — a bare $lte does not match missing fields in Mongo.
      const claimed = await this.transferModel
        .findOneAndUpdate(
          {
            _id: transfer._id,
            shopId: transfer.shopId,
            status: { $in: ['in_transit', 'partially_received'] },
            cancelClaimId: null,
            [`items.${lineIdx}.productId`]: transferItem.productId,
            [`items.${lineIdx}.receiptEventIds`]: { $ne: eventId },
            $or: [
              {
                [`items.${lineIdx}.receivedQuantity`]: {
                  $lte: transferItem.quantity - reqQty,
                },
              },
              { [`items.${lineIdx}.receivedQuantity`]: { $exists: false } },
            ],
          },
          {
            $inc: {
              [`items.${lineIdx}.receivedQuantity`]: reqQty,
              [`items.${lineIdx}.damagedQuantity`]: damQty,
              pendingReceipts: 1,
            },
            $addToSet: { [`items.${lineIdx}.receiptEventIds`]: eventId },
            $push: {
              [`items.${lineIdx}.receiptEvents`]: {
                eventId,
                receivedQuantity: reqQty,
                damagedQuantity: damQty,
                claimedAt: new Date(),
                claimedBy: new Types.ObjectId(userId),
              },
            },
            $set: {
              [`items.${lineIdx}.receivedAt`]: new Date(),
              ...(receivedItem.notes
                ? { [`items.${lineIdx}.notes`]: receivedItem.notes }
                : {}),
            },
          },
          { new: true },
        )
        .exec();

      if (!claimed) {
        const latest = await this.reread(transfer);
        if (!latest) {
          throw new NotFoundException('Stock transfer not found');
        }
        const latestLine = latest.items[lineIdx];
        if (latestLine?.receiptEventIds?.includes(eventId)) {
          // This event's bound-claim already landed (crash/retry). An
          // event id IS a payload identity — a retry carrying a
          // different quantity is a conflict, not a replay.
          const recorded = latestLine.receiptEvents?.find(
            (e) => e.eventId === eventId,
          );
          if (
            recorded &&
            (recorded.receivedQuantity !== reqQty ||
              recorded.damagedQuantity !== damQty)
          ) {
            throw new ConflictException(
              `Receipt event ${eventId} was already claimed with quantity ${recorded.receivedQuantity} (damaged ${recorded.damagedQuantity}) — refusing conflicting payload ${reqQty}/${damQty}`,
            );
          }
          // converge the stock credit below.
          transfer = latest;
        } else if (latest.cancelClaimId) {
          throw new ConflictException(
            'A cancellation is in progress for this transfer - it cannot be received',
          );
        } else if (
          !['in_transit', 'partially_received'].includes(latest.status)
        ) {
          throw new ConflictException(
            `Transfer status changed concurrently (now '${latest.status}')`,
          );
        } else {
          throw new BadRequestException(
            `Over-receipt rejected for ${transferItem.productName}: ordered ${transferItem.quantity}, already received ${latestLine?.receivedQuantity ?? 0}, requested ${reqQty}`,
          );
        }
      } else {
        transfer = claimed;
      }

      // ── Converge destination credit — exactly once per event ─────────
      const goodQuantity = reqQty - damQty;
      const mutationId =
        goodQuantity > 0
          ? this.lineMutationId(
              transfer,
              transferItem,
              lineIdx,
              occurrences,
              `receive:${eventId}`,
            )
          : undefined;
      if (goodQuantity > 0 && mutationId) {
        await this.convergeStock(
          transfer,
          shopId,
          transferItem.productId.toString(),
          transfer.isToMainStore
            ? null
            : (transfer.toBranchId?.toString() ?? null),
          goodQuantity,
          mutationId,
          userId,
          `Transfer ${transfer.transferNumber} received: ${transferItem.productName} x${goodQuantity}${damQty ? ` (${damQty} damaged)` : ''}`,
        );
      }

      // ── Mark the claim converged — atomic, self-deduping. Runs even
      // when goodQuantity == 0 (all-damaged receipts still resolve the
      // in-flight claim). The pendingReceipts decrement is guarded by
      // convergedReceiptEventIds so a retried mark can never double-count.
      const marked = await this.transferModel
        .findOneAndUpdate(
          {
            _id: transfer._id,
            shopId: transfer.shopId,
            [`items.${lineIdx}.receiptEventIds`]: eventId,
            [`items.${lineIdx}.convergedReceiptEventIds`]: { $ne: eventId },
          },
          {
            $addToSet: {
              [`items.${lineIdx}.convergedReceiptEventIds`]: eventId,
            },
            $inc: { pendingReceipts: -1 },
          },
        )
        .exec();

      // Product-history row only when THIS call actually converged the
      // line — a replay of an already-converged event writes nothing.
      if (marked) {
        markedAny = true;
        await this.auditModel.create({
          shopId: new Types.ObjectId(shopId),
          branchId: transfer.toBranchId,
          userId: new Types.ObjectId(userId),
          action: 'stock_transfer_received',
          resource: 'product',
          resourceId: transferItem.productId,
          changes: {
            transferNumber: transfer.transferNumber,
            quantity: goodQuantity,
            damagedQuantity: damQty,
            receiptEventId: eventId,
            ...(mutationId ? { mutationId } : {}),
            fromBranch: transfer.fromBranchName,
            toBranch: transfer.toBranchName,
          },
        });
      }
    }

    // ── Status finalize — 'received' requires every line fully claimed
    // AND zero in-flight receipts (pendingReceipts == 0). A concurrent
    // event still converging cannot be prematurely sealed as delivered —
    // whichever event finishes last performs the transition.
    const allReceived = transfer.items.every(
      (i) => (i.receivedQuantity ?? 0) >= i.quantity,
    );
    const newStatus = allReceived ? 'received' : 'partially_received';
    const finalized = await this.transferModel
      .findOneAndUpdate(
        {
          _id: transfer._id,
          shopId: transfer.shopId,
          status: { $in: ['in_transit', 'partially_received'] },
          $or: [
            { pendingReceipts: { $exists: false } },
            { pendingReceipts: 0 },
          ],
        },
        {
          $set: {
            status: newStatus,
            ...(allReceived
              ? {
                  receivedAt: new Date(),
                  receivedBy: new Types.ObjectId(userId),
                }
              : {}),
            ...(notes ? { receiptNotes: notes } : {}),
          },
        },
        { new: true },
      )
      .exec();

    const saved = finalized ?? (await this.reread(transfer)) ?? transfer;

    // The receive history row is written only by a call that converged at
    // least one line-claim for this event — same-event replays that found
    // everything already converged add no duplicate history.
    if (markedAny) {
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        branchId: transfer.toBranchId,
        userId: new Types.ObjectId(userId),
        action: 'receive_stock_transfer',
        resource: 'stock_transfer',
        resourceId: transfer._id,
        changes: { status: saved.status, receivedItems },
      });
    }

    this.logger.log(
      `Stock transfer ${transfer.transferNumber} ${saved.status}`,
    );

    return saved;
  }

  /**
   * Cancel a transfer — P0-8 hardened.
   *
   * No-stock states (draft/pending_approval/approved/rejected): a single
   * atomic conditional claim — a ship claim blocks it ('approved' +
   * shipClaimId means deductions are converging).
   *
   * Stocked states (in_transit/partially_received): durable cancelClaimId
   * marker (status unchanged) → converge per-line restores of the
   * OUTSTANDING quantity (quantity - receivedQuantity — never the full
   * quantity, which would duplicate stock already received at the
   * destination) → finalize cancelled. The claim marker also freezes
   * receives (their bound-claims require cancelClaimId absent), so
   * outstanding is stable while restores converge.
   */
  async cancel(
    transferId: string,
    shopId: string,
    userId: string,
    reason: string,
  ): Promise<StockTransferDocument> {
    let transfer = await this.findById(transferId, shopId);

    if (['received', 'cancelled'].includes(transfer.status)) {
      throw new BadRequestException(
        `Cannot cancel transfer with status: ${transfer.status}`,
      );
    }

    let cancelFinalized = false;
    const restoredLines: Array<{
      item: TransferItem;
      outstanding: number;
      mutationId: string;
    }> = [];
    if (['in_transit', 'partially_received'].includes(transfer.status)) {
      const claimId = `transfer:${transferId}:cancel`;

      // pendingReceipts == 0 is part of the atomic claim: a receipt
      // claimed but not yet stock-converged must NOT be treated as
      // delivered — restoring only the outstanding quantity while its
      // credit is still missing would silently erase that stock.
      const claimed = await this.transferModel
        .findOneAndUpdate(
          {
            _id: transfer._id,
            shopId: transfer.shopId,
            status: { $in: ['in_transit', 'partially_received'] },
            cancelClaimId: null,
            $or: [
              { pendingReceipts: { $exists: false } },
              { pendingReceipts: 0 },
            ],
          },
          {
            $set: {
              cancelClaimId: claimId,
              cancelStartedAt: new Date(),
              cancelClaimedBy: new Types.ObjectId(userId),
              cancelReason: reason,
            },
          },
          { new: true },
        )
        .exec();

      if (!claimed) {
        const latest = await this.reread(transfer);
        if (!latest) {
          throw new NotFoundException('Stock transfer not found');
        }
        if (latest.status === 'cancelled') {
          transfer = latest;
        } else if (
          ['in_transit', 'partially_received'].includes(latest.status) &&
          latest.cancelClaimId === claimId
        ) {
          // A cancel claim owns a canonical reason — a retry carrying a
          // different one is a conflict, never a silent replacement.
          if (latest.cancelReason && latest.cancelReason !== reason) {
            throw new ConflictException(
              'A cancellation with a different reason is already in progress for this transfer',
            );
          }
          transfer = latest;
        } else if ((latest.pendingReceipts ?? 0) > 0) {
          throw new ConflictException(
            'A receipt is still converging for this transfer - retry the receive to converge it before cancelling',
          );
        } else {
          throw new ConflictException(
            `Transfer status changed concurrently (now '${latest.status}')`,
          );
        }
      } else {
        transfer = claimed;
      }

      // ── Restore ONLY the outstanding quantity per line — exactly once ─
      const occurrences = this.countProductOccurrences(transfer.items);
      for (const [idx, item] of transfer.items.entries()) {
        const outstanding = item.quantity - (item.receivedQuantity ?? 0);
        if (outstanding <= 0) continue;
        const mutationId = this.lineMutationId(
          transfer,
          item,
          idx,
          occurrences,
          'cancel-restore',
        );
        await this.convergeStock(
          transfer,
          shopId,
          item.productId.toString(),
          transfer.isFromMainStore
            ? null
            : (transfer.fromBranchId?.toString() ?? null),
          outstanding,
          mutationId,
          userId,
          `Transfer ${transfer.transferNumber} cancelled: restored ${item.productName} x${outstanding}`,
        );
        restoredLines.push({ item, outstanding, mutationId });
      }

      // ── Finalize cancelled ───────────────────────────────────────────
      const finalized = await this.transferModel
        .findOneAndUpdate(
          {
            _id: transfer._id,
            shopId: transfer.shopId,
            // Status is part of the transition guard: cancelClaimId is
            // never unset, so without it a concurrent resume re-writes
            // 'cancelled' and both racers report a transition.
            status: { $in: ['in_transit', 'partially_received'] },
            cancelClaimId: claimId,
          },
          {
            $set: {
              status: 'cancelled',
              cancelledBy: new Types.ObjectId(userId),
              cancelledAt: new Date(),
              // The claim's persisted reason is canonical — a recovered
              // cancel replays the operator's words, never a synthetic one.
              cancellationReason: transfer.cancelReason ?? reason,
            },
          },
          { new: true },
        )
        .exec();

      if (!finalized) {
        const latest = await this.reread(transfer);
        if (!latest) {
          throw new NotFoundException('Stock transfer not found');
        }
        if (latest.status === 'cancelled') {
          transfer = latest;
        } else {
          throw new ConflictException(
            `Transfer status changed concurrently (now '${latest.status}')`,
          );
        }
      } else {
        transfer = finalized;
        cancelFinalized = true;
      }
    } else {
      // No inventory has moved — a plain atomic claim suffices. Blocked
      // while a ship claim is in flight ('approved' + shipClaimId).
      const claimed = await this.transferModel
        .findOneAndUpdate(
          {
            _id: transfer._id,
            shopId: transfer.shopId,
            status: transfer.status,
            shipClaimId: null,
            cancelClaimId: null,
          },
          {
            $set: {
              status: 'cancelled',
              cancelledBy: new Types.ObjectId(userId),
              cancelledAt: new Date(),
              cancellationReason: reason,
            },
          },
          { new: true },
        )
        .exec();

      if (!claimed) {
        const latest = await this.reread(transfer);
        if (!latest) {
          throw new NotFoundException('Stock transfer not found');
        }
        if (latest.status === 'cancelled') {
          transfer = latest;
        } else if (latest.status === 'approved' && latest.shipClaimId) {
          throw new ConflictException(
            'A shipment is in progress for this transfer - it cannot be cancelled mid-dispatch',
          );
        } else {
          throw new ConflictException(
            `Transfer status changed concurrently (now '${latest.status}')`,
          );
        }
      } else {
        transfer = claimed;
        cancelFinalized = true;
      }
    }

    const saved = transfer;

    // One logical cancellation = one history row set — written only by
    // the call that performed the atomic transition, so replays and
    // losing racers add nothing.
    if (cancelFinalized) {
      for (const line of restoredLines) {
        await this.auditModel.create({
          shopId: new Types.ObjectId(shopId),
          branchId: transfer.fromBranchId,
          userId: new Types.ObjectId(userId),
          action: 'stock_transfer_cancelled',
          resource: 'product',
          resourceId: line.item.productId,
          changes: {
            transferNumber: transfer.transferNumber,
            quantity: line.outstanding,
            reason: transfer.cancelReason ?? reason,
            stockReturned: true,
            mutationId: line.mutationId,
          },
        });
      }
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(userId),
        action: 'cancel_stock_transfer',
        resource: 'stock_transfer',
        resourceId: transfer._id,
        changes: {
          status: 'cancelled',
          cancellationReason: transfer.cancelReason ?? reason,
        },
      });
    }

    this.logger.log(`Stock transfer ${transfer.transferNumber} cancelled`);

    return saved;
  }

  /**
   * Get transfer statistics for a shop
   */
  async getStats(
    shopId: string,
    branchId?: string,
  ): Promise<{
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

    const [pending, inTransit, received, cancelled, valueAgg, thisMonth] =
      await Promise.all([
        this.transferModel.countDocuments({
          ...baseQuery,
          status: 'pending_approval',
        }),
        this.transferModel.countDocuments({
          ...baseQuery,
          status: 'in_transit',
        }),
        this.transferModel.countDocuments({ ...baseQuery, status: 'received' }),
        this.transferModel.countDocuments({
          ...baseQuery,
          status: 'cancelled',
        }),
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
