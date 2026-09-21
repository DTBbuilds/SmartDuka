import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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
  /**
   * Frontend receive form payload. Receiving is FULL-RECEIVE ONLY: every
   * line's receivedQuantity must equal its ordered quantity.
   */
  receivedItems?: Array<{
    productId: string;
    receivedQuantity: number;
  }>;
  receiveNotes?: string;
}

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(
    shopId: string,
    userId: string,
    dto: CreatePurchaseDto,
  ): Promise<PurchaseDocument> {
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

  async findById(
    purchaseId: string,
    shopId: string,
  ): Promise<PurchaseDocument | null> {
    return this.purchaseModel
      .findOne({
        _id: new Types.ObjectId(purchaseId),
        shopId: new Types.ObjectId(shopId),
      })
      .populate('supplierId', 'name phone email address')
      .exec();
  }

  /**
   * PHASE 2 / P0-7: PO TO INVENTORY INTEGRATION — CANONICAL RECEIVING CONTRACT
   *
   * ONE legitimate receipt event = ONE purchase state change + ONE stock
   * effect per line + ONE durable stock audit per line.
   *
   * Lifecycle transitions are claimed atomically at the database level:
   * only 'pending' may transition (to 'received' or 'cancelled'); received
   * and cancelled are terminal. The conditional claim — not an application
   * pre-check — is the concurrency guard, so a receive/cancel race or
   * duplicate receive resolves to exactly one winner.
   *
   * Receive ordering (P0-7A): claim first — but via a durable
   * `receivingClaimId` marker while status stays 'pending' — then converge
   * each line's stock through the P0-2 durable mutation contract keyed
   * `purchase:<poId>:<productId>` (`…:line:<idx>` when a product repeats),
   * then finalize pending→received. A crash anywhere before finalize leaves
   * pending+claim — never a false 'received' — and a retry resumes and
   * converges the rest. Retries and races re-run the convergence safely —
   * the mutation witness (receipt or StockAdjustment) makes every line
   * exactly-once.
   *
   * Multi-tenant safe: every query filters by shopId.
   */
  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    pending: ['received', 'cancelled'],
    received: [],
    cancelled: [],
  };

  async update(
    purchaseId: string,
    shopId: string,
    dto: UpdatePurchaseDto,
    userId?: string,
  ): Promise<PurchaseDocument | null> {
    const current = await this.purchaseModel.findOne({
      _id: new Types.ObjectId(purchaseId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!current) {
      throw new BadRequestException('Purchase order not found');
    }

    const targetStatus = dto.status;
    let purchase: PurchaseDocument = current;

    // Full-receive contract: when the caller supplies per-line received
    // quantities they must match the ordered quantities exactly. Validated
    // BEFORE any state claim so a bad request commits nothing.
    if (targetStatus === 'received' && dto.receivedItems?.length) {
      for (const ri of dto.receivedItems) {
        const line = current.items.find(
          (i) => i.productId.toString() === ri.productId?.toString(),
        );
        if (!line) {
          throw new BadRequestException(
            'receivedItems references a product not on this purchase order',
          );
        }
        if (ri.receivedQuantity !== line.quantity) {
          throw new BadRequestException(
            `Partial receiving is not supported: '${line.productName}' was ordered x${line.quantity} but receivedQuantity ${ri.receivedQuantity} was supplied. Receive the full ordered quantity.`,
          );
        }
      }
    }

    // ── LIFECYCLE TRANSITION — legality guard ──────────────────────────
    if (targetStatus && targetStatus !== current.status) {
      if (
        !PurchasesService.ALLOWED_TRANSITIONS[current.status]?.includes(
          targetStatus,
        )
      ) {
        throw new BadRequestException(
          `Cannot change purchase order status from '${current.status}' to '${targetStatus}'`,
        );
      }

      if (targetStatus === 'cancelled') {
        // Atomic cancel claim — blocked while a receive claim is active:
        // receivingClaimId: null only matches a purchase with no in-flight
        // receive.
        const claimed = await this.purchaseModel
          .findOneAndUpdate(
            {
              _id: current._id,
              shopId: current.shopId,
              status: 'pending',
              receivingClaimId: null,
            },
            { $set: { status: 'cancelled', updatedAt: new Date() } },
            { new: true },
          )
          .exec();

        if (!claimed) {
          const latest = await this.purchaseModel
            .findOne({ _id: current._id, shopId: current.shopId })
            .exec();
          if (!latest) {
            throw new BadRequestException('Purchase order not found');
          }
          if (latest.status === 'cancelled') {
            purchase = latest;
          } else if (latest.status === 'pending' && latest.receivingClaimId) {
            throw new ConflictException(
              'A receive is in progress for this purchase order - it cannot be cancelled mid-receipt',
            );
          } else {
            throw new ConflictException(
              `Purchase order status changed concurrently (now '${latest.status}')`,
            );
          }
        } else {
          purchase = claimed;
        }
      }
    }

    // ── RECEIVE — durable claim → converge stock → finalize ────────────
    // The claim marks the purchase WITHOUT flipping status: a crash after
    // the claim leaves pending+receivingClaimId (resumable), never a false
    // 'received'. Only after every stock line is durably applied does the
    // finalize write flip pending→received.
    if (targetStatus === 'received') {
      const claimId = `purchase:${purchaseId}:receive`;

      if (current.status !== 'received') {
        const claimed = await this.purchaseModel
          .findOneAndUpdate(
            {
              _id: current._id,
              shopId: current.shopId,
              status: 'pending',
              receivingClaimId: null,
            },
            {
              $set: {
                receivingClaimId: claimId,
                receivingStartedAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { new: true },
          )
          .exec();

        if (!claimed) {
          const latest = await this.purchaseModel
            .findOne({ _id: current._id, shopId: current.shopId })
            .exec();
          if (!latest) {
            throw new BadRequestException('Purchase order not found');
          }
          if (
            latest.status === 'received' ||
            (latest.status === 'pending' && latest.receivingClaimId)
          ) {
            // Already finalized, or the canonical receive claim is active —
            // resume/converge the same logical operation.
            purchase = latest;
          } else {
            throw new ConflictException(
              `Purchase order status changed concurrently (now '${latest.status}')`,
            );
          }
        } else {
          purchase = claimed;
        }
      }

      // INVENTORY CONVERGENCE — runs for the claiming request, a resumed
      // claim, and idempotent retries on an already-received purchase:
      // each line's mutationId is deduplicated by the P0-2 durable witness.
      // Line identity: a productId that appears on multiple lines is
      // disambiguated by index so legitimate lines never collapse into one
      // mutation.
      const occurrences = new Map<string, number>();
      for (const item of purchase.items) {
        const pid = item.productId.toString();
        occurrences.set(pid, (occurrences.get(pid) ?? 0) + 1);
      }

      const stockIncreaseErrors: string[] = [];
      for (const [idx, item] of purchase.items.entries()) {
        if (item.quantity <= 0) continue;
        const pid = item.productId.toString();
        const mutationId =
          (occurrences.get(pid) ?? 0) > 1
            ? `purchase:${purchase._id?.toString() ?? purchase.purchaseNumber}:${pid}:line:${idx}`
            : `purchase:${purchase._id?.toString() ?? purchase.purchaseNumber}:${pid}`;
        const purchaseMutation = {
          mutationId,
          reason: 'purchase',
          actor: userId || 'system',
          referenceType: 'purchase',
          referenceId: purchase._id?.toString() ?? purchase.purchaseNumber,
          notes: `Purchase Order ${purchase.purchaseNumber} - ${item.productName} x${item.quantity}`,
        };
        try {
          const updatedProduct = purchase.branchId
            ? await this.inventoryService.updateBranchStock(
                shopId,
                pid,
                purchase.branchId.toString(),
                item.quantity,
                purchaseMutation,
              )
            : await this.inventoryService.updateStock(
                shopId,
                pid,
                item.quantity,
                purchaseMutation,
              );

          if (!updatedProduct) {
            stockIncreaseErrors.push(
              `Product ${item.productId} not found in shop ${shopId}`,
            );
            continue;
          }

          this.logger.log(
            `Stock increased for ${item.productName}: +${item.quantity} (PO: ${purchase.purchaseNumber})`,
          );
        } catch (error: any) {
          stockIncreaseErrors.push(
            `Failed to increase stock for ${item.productName}: ${error?.message || 'Unknown error'}`,
          );
          this.logger.error(
            `Stock increase error for ${item.productName}:`,
            error,
          );
        }
      }

      if (stockIncreaseErrors.length > 0) {
        const warning = `INVENTORY SYNC WARNING: ${stockIncreaseErrors.join('; ')}`;
        this.logger.error(
          `Stock increase errors for PO ${purchase.purchaseNumber}:`,
          stockIncreaseErrors,
        );
        // Persist the warning on the purchase itself — the failure is loud
        // and a retry of the receive converges the missing lines.
        await this.purchaseModel
          .updateOne(
            { _id: purchase._id, shopId: purchase.shopId },
            {
              $set: {
                notes: `${purchase.notes ?? ''}${purchase.notes ? '\n' : ''}⚠️ ${warning}`,
                updatedAt: new Date(),
              },
            },
          )
          .exec();
        throw new BadRequestException(
          `Purchase order ${purchase.purchaseNumber} received with inventory errors - retry to converge remaining lines: ${stockIncreaseErrors.join('; ')}`,
        );
      }

      // ── FINALIZE — the claim owner flips pending→received only after
      // every stock line is durably proven applied. A crash before this
      // write leaves pending+claim (resumable); a concurrent winner's
      // finalize makes this attempt idempotent.
      if (purchase.status !== 'received') {
        const finalized = await this.purchaseModel
          .findOneAndUpdate(
            {
              _id: purchase._id,
              shopId: purchase.shopId,
              status: 'pending',
              receivingClaimId: claimId,
            },
            {
              $set: {
                status: 'received',
                receivedDate: dto.receivedDate ?? new Date(),
                updatedAt: new Date(),
              },
            },
            { new: true },
          )
          .exec();

        if (!finalized) {
          const latest = await this.purchaseModel
            .findOne({ _id: purchase._id, shopId: purchase.shopId })
            .exec();
          if (!latest) {
            throw new BadRequestException('Purchase order not found');
          }
          if (latest.status === 'received') {
            purchase = latest;
          } else {
            throw new ConflictException(
              `Purchase order status changed concurrently (now '${latest.status}')`,
            );
          }
        } else {
          purchase = finalized;
        }
      }
    }

    // ── Apply remaining updatable fields ───────────────────────────────
    // Whitelisted: only these fields may be patched. Status flows through
    // the lifecycle claims above; items/totals/claim markers can never be
    // rewritten by a generic update (which would falsify stock provenance).
    const rest: Record<string, any> = {};
    if (dto.receivedDate !== undefined) rest.receivedDate = dto.receivedDate;
    if (dto.invoiceNumber !== undefined) rest.invoiceNumber = dto.invoiceNumber;
    if (dto.notes !== undefined) rest.notes = dto.notes;

    const updated = await this.purchaseModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(purchaseId),
          shopId: new Types.ObjectId(shopId),
        },
        { ...rest, updatedAt: new Date() },
        { new: true },
      )
      .populate('supplierId', 'name phone email')
      .exec();

    return updated;
  }

  /**
   * Hard delete is only permitted for purchases that never touched
   * inventory. A received purchase carries durable stock mutations and
   * audit records — deleting it would erase the business explanation for
   * stock that physically exists.
   */
  async delete(purchaseId: string, shopId: string): Promise<boolean> {
    const purchase = await this.purchaseModel
      .findOne({
        _id: new Types.ObjectId(purchaseId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!purchase) {
      return false;
    }
    if (purchase.status === 'received') {
      throw new BadRequestException(
        'Cannot delete a received purchase order - its inventory effect must remain auditable',
      );
    }
    if (purchase.receivingClaimId) {
      throw new ConflictException(
        'A receive is in progress for this purchase order - it cannot be deleted mid-receipt',
      );
    }

    // Atomic guard closes the delete/receive race: the delete only lands if
    // the purchase is still non-received AND has no active receive claim at
    // write time.
    const result = await this.purchaseModel
      .deleteOne({
        _id: new Types.ObjectId(purchaseId),
        shopId: new Types.ObjectId(shopId),
        status: { $ne: 'received' },
        receivingClaimId: null,
      })
      .exec();
    if (result.deletedCount === 0) {
      throw new ConflictException(
        'Purchase order status changed concurrently - reload and retry',
      );
    }
    return true;
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

  async getBySupplier(
    supplierId: string,
    shopId: string,
  ): Promise<PurchaseDocument[]> {
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
  async findByBranch(
    shopId: string,
    branchId: string,
  ): Promise<PurchaseDocument[]> {
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
  async getPendingByBranch(
    shopId: string,
    branchId: string,
  ): Promise<PurchaseDocument[]> {
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
  async getReceivedByBranch(
    shopId: string,
    branchId: string,
  ): Promise<PurchaseDocument[]> {
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
  async exportPurchasesCSV(
    shopId: string,
    res: any,
    status?: string,
  ): Promise<void> {
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
    const productIds = Array.from(
      new Set(
        (purchases as any[])
          .flatMap((po) => (Array.isArray(po.items) ? po.items : []))
          .map((item: any) => item?.productId?.toString())
          .filter(Boolean),
      ),
    );
    const skuByProductId = new Map<string, string>();
    if (productIds.length > 0) {
      try {
        const productDocs = await this.purchaseModel.db
          .collection('products')
          .find({
            _id: { $in: productIds.map((id) => new Types.ObjectId(id)) },
          })
          .project({ sku: 1 })
          .toArray();
        productDocs.forEach((p: any) => {
          if (p?.sku) skuByProductId.set(p._id.toString(), p.sku);
        });
      } catch (err) {
        this.logger.warn(
          `Could not resolve product SKUs for PO export: ${err?.message}`,
        );
      }
    }

    const headers = [
      'purchaseNumber',
      'status',
      'supplier',
      'invoiceNumber',
      'createdAt',
      'expectedDeliveryDate',
      'receivedDate',
      'productName',
      'productSku',
      'quantity',
      'unitCost',
      'lineTotal',
      'poTotal',
      'notes',
    ];

    const rows: (string | number)[][] = [];
    for (const po of purchases as any[]) {
      const supplierName = po.supplierId?.name || '';
      const created = po.createdAt
        ? new Date(po.createdAt).toISOString().split('T')[0]
        : '';
      const expected = po.expectedDeliveryDate
        ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0]
        : '';
      const received = po.receivedDate
        ? new Date(po.receivedDate).toISOString().split('T')[0]
        : '';
      const items =
        Array.isArray(po.items) && po.items.length > 0 ? po.items : [{}];
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
    const csv =
      '\ufeff' +
      [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join(
        '\n',
      );

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
      if (s.name)
        supplierByName.set(String(s.name).toLowerCase().trim(), s._id);
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
    const groups = new Map<
      string,
      { meta: any; lines: any[]; rowNums: number[] }
    >();
    rows.forEach((raw, idx) => {
      const rowNum = idx + 2; // account for header row
      const supplierName = String(raw.supplier || '').trim();
      const purchaseNumber = String(raw.purchaseNumber || '').trim();
      const invoiceNumber = String(raw.invoiceNumber || '').trim();
      const groupKey =
        purchaseNumber ||
        `__new__:${supplierName.toLowerCase()}|${invoiceNumber}|${idx}`;

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

      const product =
        (productSku && productBySku.get(productSku.toLowerCase())) ||
        (productName && productByName.get(productName.toLowerCase()));
      if (!product) {
        errors.push(
          `Row ${rowNum}: product "${productName || productSku}" not found in inventory`,
        );
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
        const existing = await this.purchaseModel
          .findOne({
            shopId: shopObjId,
            purchaseNumber: group.meta.purchaseNumber,
          })
          .lean();
        if (existing) {
          skipped++;
          continue;
        }
      }

      const totalCost = group.lines.reduce((sum, l) => sum + l.totalCost, 0);
      const status = ['pending', 'received', 'cancelled'].includes(
        group.meta.status,
      )
        ? group.meta.status
        : 'pending';

      // P0-7: importing a PO as 'received' would create a purchase-state /
      // inventory divergence — the record claims stock arrived while no
      // durable mutation ever ran. Import as 'pending' and receive through
      // the standard update flow so inventory is applied exactly once.
      if (status === 'received') {
        errors.push(
          `Rows ${group.rowNums.join(',')}: status 'received' cannot be imported - import as 'pending' and receive via the standard update flow`,
        );
        skipped++;
        continue;
      }

      try {
        await this.purchaseModel.create({
          purchaseNumber:
            group.meta.purchaseNumber || `PO-${Date.now()}-${nanoid(6)}`,
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
  async getBranchStats(
    shopId: string,
    branchId: string,
  ): Promise<{
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

    const pending = purchases.filter((p) => p.status === 'pending').length;
    const received = purchases.filter((p) => p.status === 'received').length;
    const totalSpent = purchases.reduce((sum, p) => sum + p.totalCost, 0);

    return {
      totalPurchases: purchases.length,
      pendingPurchases: pending,
      receivedPurchases: received,
      totalSpent,
    };
  }
}
