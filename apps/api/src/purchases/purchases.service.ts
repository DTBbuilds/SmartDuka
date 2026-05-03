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
   * Export purchase orders to CSV.
   * One row per PO line item (so accounting/spreadsheets can analyse spend per product).
   */
  async exportPurchasesCSV(shopId: string, res: any, status?: string): Promise<void> {
    const filter: any = { shopId: new Types.ObjectId(shopId) };
    if (status && ['pending', 'received', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    const purchases = await this.purchaseModel
      .find(filter)
      .populate('supplierId', 'name')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Resolve SKUs for all unique product IDs across all POs so the exported CSV is re-importable
    const productIds = Array.from(new Set(
      (purchases as any[])
        .flatMap(po => Array.isArray(po.items) ? po.items : [])
        .map((item: any) => item?.productId?.toString())
        .filter(Boolean)
    ));
    const skuByProductId = new Map<string, string>();
    if (productIds.length > 0) {
      try {
        const productDocs = await this.purchaseModel.db
          .collection('products')
          .find({ _id: { $in: productIds.map(id => new Types.ObjectId(id)) } })
          .project({ sku: 1 })
          .toArray();
        productDocs.forEach((p: any) => {
          if (p?.sku) skuByProductId.set(p._id.toString(), p.sku);
        });
      } catch (err) {
        this.logger.warn(`Could not resolve product SKUs for PO export: ${(err as any)?.message}`);
      }
    }

    const headers = [
      'purchaseNumber', 'status', 'supplier', 'invoiceNumber',
      'createdAt', 'expectedDeliveryDate', 'receivedDate',
      'productName', 'productSku', 'quantity', 'unitCost', 'lineTotal',
      'poTotal', 'notes',
    ];

    const rows: (string | number)[][] = [];
    for (const po of purchases as any[]) {
      const supplierName = po.supplierId?.name || '';
      const created = po.createdAt ? new Date(po.createdAt).toISOString().split('T')[0] : '';
      const expected = po.expectedDeliveryDate
        ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0]
        : '';
      const received = po.receivedDate
        ? new Date(po.receivedDate).toISOString().split('T')[0]
        : '';
      const items = Array.isArray(po.items) && po.items.length > 0 ? po.items : [{}];
      for (const item of items) {
        const productIdStr = item?.productId?.toString?.() || '';
        rows.push([
          po.purchaseNumber || '',
          po.status || '',
          supplierName,
          po.invoiceNumber || '',
          created,
          expected,
          received,
          item.productName || '',
          skuByProductId.get(productIdStr) || '',
          item.quantity ?? '',
          item.unitCost ?? '',
          item.totalCost ?? '',
          po.totalCost ?? 0,
          po.notes || '',
        ]);
      }
    }

    const escape = (cell: any) => {
      const str = String(cell ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    const csv = '\ufeff' + [
      headers.join(','),
      ...rows.map(r => r.map(escape).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=purchase-orders-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csv);
  }

  /**
   * Bulk import purchase orders from CSV rows.
   * Accepts the same row format produced by exportPurchasesCSV: one row per line item,
   * grouped by purchaseNumber. Rows without a purchaseNumber are grouped per (supplier+invoice)
   * and a new PO number is generated.
   *
   * Resolution rules:
   *  - supplier: looked up by name (case-insensitive) within shop
   *  - product:  looked up by sku, then by exact name within shop
   *  - status defaults to 'pending'; receiving stock updates require the standard PUT flow
   */
  async importPurchasesCSV(
    shopId: string,
    userId: string,
    rows: Array<Record<string, any>>,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    if (!Array.isArray(rows) || rows.length === 0) {
      return { created: 0, skipped: 0, errors: ['No rows provided'] };
    }

    const shopObjId = new Types.ObjectId(shopId);

    // Preload suppliers and products for resolution
    const db = this.purchaseModel.db;
    const suppliers = await db
      .collection('suppliers')
      .find({ shopId: shopObjId })
      .project({ _id: 1, name: 1 })
      .toArray();
    const supplierByName = new Map<string, Types.ObjectId>();
    suppliers.forEach((s: any) => {
      if (s.name) supplierByName.set(String(s.name).toLowerCase().trim(), s._id);
    });

    const products = await db
      .collection('products')
      .find({ shopId: shopObjId })
      .project({ _id: 1, name: 1, sku: 1 })
      .toArray();
    const productBySku = new Map<string, any>();
    const productByName = new Map<string, any>();
    products.forEach((p: any) => {
      if (p.sku) productBySku.set(String(p.sku).toLowerCase().trim(), p);
      if (p.name) productByName.set(String(p.name).toLowerCase().trim(), p);
    });

    // Group rows by purchaseNumber (or synthetic key)
    const groups = new Map<string, { meta: any; lines: any[]; rowNums: number[] }>();
    rows.forEach((raw, idx) => {
      const rowNum = idx + 2; // account for header row
      const supplierName = String(raw.supplier || '').trim();
      const purchaseNumber = String(raw.purchaseNumber || '').trim();
      const invoiceNumber = String(raw.invoiceNumber || '').trim();
      const groupKey = purchaseNumber || `__new__:${supplierName.toLowerCase()}|${invoiceNumber}|${idx}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          meta: {
            purchaseNumber: purchaseNumber || undefined,
            supplier: supplierName,
            invoiceNumber: invoiceNumber || undefined,
            status: String(raw.status || 'pending').toLowerCase(),
            expectedDeliveryDate: raw.expectedDeliveryDate || undefined,
            receivedDate: raw.receivedDate || undefined,
            notes: raw.notes || undefined,
          },
          lines: [],
          rowNums: [],
        });
      }
      const group = groups.get(groupKey)!;
      group.rowNums.push(rowNum);

      const productName = String(raw.productName || '').trim();
      const productSku = String(raw.productSku || '').trim();
      const quantity = Number(raw.quantity);
      const unitCost = Number(raw.unitCost);

      if (!productName && !productSku) {
        errors.push(`Row ${rowNum}: missing productName/productSku`);
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push(`Row ${rowNum}: quantity must be a positive number`);
        return;
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        errors.push(`Row ${rowNum}: unitCost must be a non-negative number`);
        return;
      }

      let product =
        (productSku && productBySku.get(productSku.toLowerCase())) ||
        (productName && productByName.get(productName.toLowerCase()));
      if (!product) {
        errors.push(`Row ${rowNum}: product "${productName || productSku}" not found in inventory`);
        return;
      }

      group.lines.push({
        productId: product._id,
        productName: product.name,
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
      });
    });

    // Persist each group as a PO
    for (const [groupKey, group] of groups.entries()) {
      if (group.lines.length === 0) {
        skipped++;
        continue;
      }

      const supplierId = supplierByName.get(group.meta.supplier.toLowerCase());
      if (!supplierId) {
        errors.push(
          `Rows ${group.rowNums.join(',')}: supplier "${group.meta.supplier}" not found - create it first`,
        );
        skipped++;
        continue;
      }

      // Skip if a PO with this purchaseNumber already exists (idempotent re-import)
      if (group.meta.purchaseNumber) {
        const existing = await this.purchaseModel.findOne({
          shopId: shopObjId,
          purchaseNumber: group.meta.purchaseNumber,
        }).lean();
        if (existing) {
          skipped++;
          continue;
        }
      }

      const totalCost = group.lines.reduce((sum, l) => sum + l.totalCost, 0);
      const status = ['pending', 'received', 'cancelled'].includes(group.meta.status)
        ? group.meta.status
        : 'pending';

      try {
        await this.purchaseModel.create({
          purchaseNumber: group.meta.purchaseNumber || `PO-${Date.now()}-${nanoid(6)}`,
          supplierId,
          shopId: shopObjId,
          items: group.lines,
          totalCost,
          status,
          expectedDeliveryDate: group.meta.expectedDeliveryDate
            ? new Date(group.meta.expectedDeliveryDate)
            : undefined,
          receivedDate: group.meta.receivedDate
            ? new Date(group.meta.receivedDate)
            : undefined,
          invoiceNumber: group.meta.invoiceNumber,
          notes: group.meta.notes,
          createdBy: new Types.ObjectId(userId),
        });
        created++;
      } catch (err: any) {
        errors.push(
          `PO ${group.meta.purchaseNumber || groupKey}: failed to create - ${err?.message || 'unknown error'}`,
        );
        skipped++;
      }
    }

    return { created, skipped, errors };
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
