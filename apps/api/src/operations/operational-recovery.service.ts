import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { Purchase, PurchaseDocument } from '../purchases/purchase.schema';
import { PurchasesService } from '../purchases/purchases.service';
import {
  StockTransfer,
  StockTransferDocument,
} from '../branches/schemas/stock-transfer.schema';
import {
  StockTransferService,
  ReceiveItemDto,
} from '../branches/services/stock-transfer.service';

/**
 * P0-7C — OPERATIONAL CLAIM CONVERGENCE
 *
 * DURABLE CLAIM + DURABLE OPERATION DATA + DURABLE STOCK WITNESS =
 * SERVER-RECOVERABLE WORKFLOW.
 *
 * Every inventory workflow hardened in P0-7/P0-8 already persists enough
 * state to converge without the original client: the claim marker, the
 * operation payload, and deterministic P0-2 mutation identities. This
 * service replays the SAME service entry points the original request used —
 * no second lifecycle, no duplicate mutation logic. Idempotency is carried
 * by the existing atomic claims and stock-mutation witnesses, so concurrent
 * workers and repeated sweeps are safe.
 *
 * Claim surfaces recovered:
 *   Purchase.receivingClaimId          → resume receive convergence
 *   StockTransfer.shipClaimId          → resume source-debit convergence
 *   StockTransfer pending receiptEvents→ replay persisted receipt payload
 *   StockTransfer.cancelClaimId        → resume outstanding-only restore
 *
 * P0-2 unprojected audit receipts are already swept by
 * InventoryService.sweepUnprojectedStockMutations — intentionally untouched.
 */
export type RecoveryOutcome =
  | 'CONVERGED'
  | 'ALREADY_CONVERGED'
  | 'NOT_STALE'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'FAILED_RETRYABLE';

export interface RecoveryResult {
  workflow:
    | 'purchase_receive'
    | 'transfer_ship'
    | 'transfer_receipt'
    | 'transfer_cancel';
  resourceId: string;
  shopId: string;
  claimId?: string;
  eventId?: string;
  outcome: RecoveryOutcome;
  detail?: string;
}

/** A claim must outlive this age before a sweep treats it as stranded. */
export const STALE_CLAIM_MS = 10 * 60 * 1000;
/** Bounded sweep — never scan unbounded candidate sets. */
export const SWEEP_BATCH_LIMIT = 50;
/** Nil ObjectId actor when no persisted actor exists on the resource. */
const NIL_ACTOR = '000000000000000000000000';

@Injectable()
export class OperationalRecoveryService {
  private readonly logger = new Logger(OperationalRecoveryService.name);

  constructor(
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(StockTransfer.name)
    private readonly transferModel: Model<StockTransferDocument>,
    private readonly purchasesService: PurchasesService,
    private readonly stockTransferService: StockTransferService,
  ) {}

  // ── SWEEP ──────────────────────────────────────────────────────────
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweepStrandedClaims(): Promise<void> {
    const results = await this.sweep(new Date(Date.now() - STALE_CLAIM_MS));
    const recovered = results.filter((r) => r.outcome === 'CONVERGED');
    const review = results.filter(
      (r) => r.outcome === 'MANUAL_REVIEW_REQUIRED',
    );
    if (recovered.length || review.length) {
      this.logger.warn(
        `Claim-convergence sweep: ${recovered.length} converged, ${review.length} need manual review, ${results.length} candidate(s) examined`,
      );
    }
  }

  /** Bounded candidate scan + convergence. Exposed for tests/manual run. */
  async sweep(cutoff: Date): Promise<RecoveryResult[]> {
    const results: RecoveryResult[] = [];

    const purchases = await this.purchaseModel
      .find({
        status: 'pending',
        receivingClaimId: { $ne: null },
        $or: [
          { receivingStartedAt: { $lt: cutoff } },
          { receivingStartedAt: { $exists: false } },
        ],
      })
      .limit(SWEEP_BATCH_LIMIT)
      .exec();
    for (const p of purchases) {
      results.push(await this.convergePurchase(p, cutoff));
    }

    const ships = await this.transferModel
      .find({
        status: 'approved',
        shipClaimId: { $ne: null },
        $or: [
          { shipStartedAt: { $lt: cutoff } },
          { shipStartedAt: { $exists: false } },
        ],
      })
      .limit(SWEEP_BATCH_LIMIT)
      .exec();
    for (const t of ships) {
      results.push(await this.convergeShip(t, cutoff));
    }

    const receiptPending = await this.transferModel
      .find({ pendingReceipts: { $gt: 0 } })
      .limit(SWEEP_BATCH_LIMIT)
      .exec();
    for (const t of receiptPending) {
      results.push(...(await this.convergeReceipts(t, cutoff)));
    }

    const cancels = await this.transferModel
      .find({
        status: { $in: ['in_transit', 'partially_received'] },
        cancelClaimId: { $ne: null },
        $or: [
          { cancelStartedAt: { $lt: cutoff } },
          { cancelStartedAt: { $exists: false } },
        ],
      })
      .limit(SWEEP_BATCH_LIMIT)
      .exec();
    for (const t of cancels) {
      results.push(await this.convergeCancel(t, cutoff));
    }

    return results;
  }

  // ── PURCHASE RECEIVE ───────────────────────────────────────────────
  // The claim data IS the operation data: purchase.items + branchId fully
  // define the stock effect. Resume = re-invoke update(status=received);
  // the service's claim branch detects the active claim and converges.
  async convergePurchase(
    purchase: PurchaseDocument,
    cutoff: Date,
    force = false,
  ): Promise<RecoveryResult> {
    const base = {
      workflow: 'purchase_receive' as const,
      resourceId: purchase._id?.toString() ?? '',
      shopId: purchase.shopId?.toString() ?? '',
      claimId: purchase.receivingClaimId,
    };

    if (purchase.status === 'received' && !purchase.receivingClaimId) {
      return this.result(base, 'ALREADY_CONVERGED');
    }
    if (purchase.status !== 'pending' || !purchase.receivingClaimId) {
      return this.result(base, 'INVALID_STATE', `status=${purchase.status}`);
    }
    if (!force && !this.isStale(purchase.receivingStartedAt, cutoff)) {
      return this.result(base, 'NOT_STALE');
    }
    const items = purchase.items ?? [];
    if (!items.length || items.every((i: any) => !(i.quantity > 0))) {
      return this.result(
        base,
        'MANUAL_REVIEW_REQUIRED',
        'no receivable lines on claimed purchase',
      );
    }

    try {
      await this.purchasesService.update(
        base.resourceId,
        base.shopId,
        { status: 'received' },
        purchase.createdBy?.toString() ?? NIL_ACTOR,
      );
      const latest = await this.purchaseModel
        .findOne({ _id: purchase._id, shopId: purchase.shopId })
        .exec();
      return latest?.status === 'received'
        ? this.result(base, 'CONVERGED')
        : this.result(base, 'FAILED_RETRYABLE', 'claim still open');
    } catch (error: any) {
      return this.result(base, this.classifyError(error), error?.message);
    }
  }

  // ── TRANSFER SHIP ──────────────────────────────────────────────────
  // approved + shipClaimId: items + fromBranchId fully define the source
  // debit; ship() resumes an active canonical claim and converges per-line
  // via P0-2 witnesses before finalizing in_transit.
  async convergeShip(
    transfer: StockTransferDocument,
    cutoff: Date,
    force = false,
  ): Promise<RecoveryResult> {
    const base = {
      workflow: 'transfer_ship' as const,
      resourceId: transfer._id?.toString() ?? '',
      shopId: transfer.shopId?.toString() ?? '',
      claimId: transfer.shipClaimId,
    };

    if (transfer.status === 'in_transit') {
      return this.result(base, 'ALREADY_CONVERGED');
    }
    if (transfer.status !== 'approved' || !transfer.shipClaimId) {
      return this.result(base, 'INVALID_STATE', `status=${transfer.status}`);
    }
    if (!force && !this.isStale(transfer.shipStartedAt, cutoff)) {
      return this.result(base, 'NOT_STALE');
    }

    try {
      await this.stockTransferService.ship(
        base.resourceId,
        base.shopId,
        this.actorFor(transfer),
      );
      return this.result(base, 'CONVERGED');
    } catch (error: any) {
      return this.result(base, this.classifyError(error), error?.message);
    }
  }

  // ── TRANSFER RECEIPTS ──────────────────────────────────────────────
  // Each claimed-but-unconverged line event is replayed from its persisted
  // receiptEvents[] record — the ORIGINAL eventId and payload, so the
  // receive() resume path dedupes the bound-claim and the P0-2 witness
  // dedupes the destination credit. The client never needs to return.
  async convergeReceipts(
    transfer: StockTransferDocument,
    cutoff: Date,
    force = false,
  ): Promise<RecoveryResult[]> {
    const base = {
      workflow: 'transfer_receipt' as const,
      resourceId: transfer._id?.toString() ?? '',
      shopId: transfer.shopId?.toString() ?? '',
    };

    if ((transfer.pendingReceipts ?? 0) <= 0) {
      return [this.result(base, 'ALREADY_CONVERGED')];
    }
    if (transfer.cancelClaimId) {
      // Cannot happen through the atomic claims (cancel requires
      // pendingReceipts == 0); if seen, the record is inconsistent.
      return [
        this.result(
          base,
          'MANUAL_REVIEW_REQUIRED',
          'pendingReceipts>0 with active cancelClaimId',
        ),
      ];
    }

    // Group unresolved line-claims by event: one event may span lines.
    const events = new Map<
      string,
      { items: ReceiveItemDto[]; stale: boolean }
    >();
    const unreconstructable: string[] = [];
    for (const item of transfer.items ?? []) {
      const converged = new Set(item.convergedReceiptEventIds ?? []);
      for (const eventId of item.receiptEventIds ?? []) {
        if (converged.has(eventId)) continue;
        const record = (item.receiptEvents ?? []).find(
          (e) => e.eventId === eventId,
        );
        if (!record) {
          // Claimed before payload records existed — cannot replay safely.
          unreconstructable.push(eventId);
          continue;
        }
        const entry = events.get(eventId) ?? { items: [], stale: false };
        entry.items.push({
          productId: item.productId.toString(),
          receivedQuantity: record.receivedQuantity,
          damagedQuantity: record.damagedQuantity,
        });
        if (force || this.isStale(record.claimedAt, cutoff)) {
          entry.stale = true;
        }
        events.set(eventId, entry);
      }
    }

    const results: RecoveryResult[] = unreconstructable.map((eventId) =>
      this.result(
        { ...base, eventId },
        'MANUAL_REVIEW_REQUIRED',
        'claimed event has no persisted payload record',
      ),
    );

    for (const [eventId, entry] of events) {
      if (!entry.stale) {
        results.push(this.result({ ...base, eventId }, 'NOT_STALE'));
        continue;
      }
      try {
        await this.stockTransferService.receive(
          base.resourceId,
          base.shopId,
          this.actorFor(transfer),
          entry.items,
          undefined,
          eventId,
        );
        results.push(this.result({ ...base, eventId }, 'CONVERGED'));
      } catch (error: any) {
        results.push(
          this.result(
            { ...base, eventId },
            this.classifyError(error),
            error?.message,
          ),
        );
      }
    }

    return results.length ? results : [this.result(base, 'ALREADY_CONVERGED')];
  }

  // ── TRANSFER CANCEL ────────────────────────────────────────────────
  // in_transit/partially_received + cancelClaimId: outstanding quantity is
  // derivable (quantity - receivedQuantity); cancel() resumes the canonical
  // claim and restores each line exactly once via `cancel-restore` witnesses.
  async convergeCancel(
    transfer: StockTransferDocument,
    cutoff: Date,
    force = false,
  ): Promise<RecoveryResult> {
    const base = {
      workflow: 'transfer_cancel' as const,
      resourceId: transfer._id?.toString() ?? '',
      shopId: transfer.shopId?.toString() ?? '',
      claimId: transfer.cancelClaimId,
    };

    if (transfer.status === 'cancelled') {
      return this.result(base, 'ALREADY_CONVERGED');
    }
    if (
      !['in_transit', 'partially_received'].includes(transfer.status) ||
      !transfer.cancelClaimId
    ) {
      return this.result(base, 'INVALID_STATE', `status=${transfer.status}`);
    }
    if (!force && !this.isStale(transfer.cancelStartedAt, cutoff)) {
      return this.result(base, 'NOT_STALE');
    }

    try {
      await this.stockTransferService.cancel(
        base.resourceId,
        base.shopId,
        this.actorFor(transfer),
        'Operational recovery of interrupted cancellation',
      );
      return this.result(base, 'CONVERGED');
    } catch (error: any) {
      return this.result(base, this.classifyError(error), error?.message);
    }
  }

  // ── MANUAL OPERATOR PATH ───────────────────────────────────────────
  // Same convergence internals as the sweep; force bypasses the age gate.
  // Tenant scope is enforced by the caller's shopId.
  async recoverResource(
    workflow: 'purchase' | 'transfer',
    resourceId: string,
    shopId: string,
  ): Promise<RecoveryResult[]> {
    const cutoff = new Date(Date.now() - STALE_CLAIM_MS);

    if (workflow === 'purchase') {
      const purchase = await this.purchaseModel
        .findOne({
          _id: new Types.ObjectId(resourceId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      if (!purchase) {
        return [
          this.result(
            {
              workflow: 'purchase_receive',
              resourceId,
              shopId,
            },
            'NOT_FOUND',
          ),
        ];
      }
      return [await this.convergePurchase(purchase, cutoff, true)];
    }

    const transfer = await this.transferModel
      .findOne({
        _id: new Types.ObjectId(resourceId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!transfer) {
      return [
        this.result(
          {
            workflow: 'transfer_ship',
            resourceId,
            shopId,
          },
          'NOT_FOUND',
        ),
      ];
    }

    if ((transfer.pendingReceipts ?? 0) > 0) {
      return this.convergeReceipts(transfer, cutoff, true);
    }
    if (transfer.status === 'approved' && transfer.shipClaimId) {
      return [await this.convergeShip(transfer, cutoff, true)];
    }
    if (transfer.cancelClaimId) {
      return [await this.convergeCancel(transfer, cutoff, true)];
    }
    return [
      this.result(
        { workflow: 'transfer_ship', resourceId, shopId },
        'ALREADY_CONVERGED',
        'no open claim on transfer',
      ),
    ];
  }

  // ── READ-ONLY VISIBILITY ───────────────────────────────────────────
  // Stranded + in-flight claims for one tenant. No business payloads —
  // claim identity, age and staleness only.
  async listStrandedClaims(shopId: string): Promise<
    Array<{
      workflow: string;
      resourceId: string;
      claimId?: string;
      pendingReceipts?: number;
      claimStartedAt?: Date | string;
      stale: boolean;
    }>
  > {
    const cutoff = Date.now() - STALE_CLAIM_MS;
    const shop = new Types.ObjectId(shopId);
    const out: any[] = [];

    const purchases = await this.purchaseModel
      .find({
        shopId: shop,
        status: 'pending',
        receivingClaimId: { $ne: null },
      })
      .limit(SWEEP_BATCH_LIMIT)
      .exec();
    for (const p of purchases) {
      out.push({
        workflow: 'purchase_receive',
        resourceId: p._id?.toString(),
        claimId: p.receivingClaimId,
        claimStartedAt: p.receivingStartedAt,
        stale: this.isStale(p.receivingStartedAt, new Date(cutoff)),
      });
    }

    const transfers = await this.transferModel
      .find({
        shopId: shop,
        $or: [
          { status: 'approved', shipClaimId: { $ne: null } },
          { pendingReceipts: { $gt: 0 } },
          {
            status: { $in: ['in_transit', 'partially_received'] },
            cancelClaimId: { $ne: null },
          },
        ],
      })
      .limit(SWEEP_BATCH_LIMIT)
      .exec();
    for (const t of transfers) {
      if (t.status === 'approved' && t.shipClaimId) {
        out.push({
          workflow: 'transfer_ship',
          resourceId: t._id?.toString(),
          claimId: t.shipClaimId,
          claimStartedAt: t.shipStartedAt,
          stale: this.isStale(t.shipStartedAt, new Date(cutoff)),
        });
      }
      if ((t.pendingReceipts ?? 0) > 0) {
        const oldest = (t.items ?? [])
          .flatMap((i) => i.receiptEvents ?? [])
          .map((e) => e.claimedAt)
          .filter(Boolean)
          .sort()[0];
        out.push({
          workflow: 'transfer_receipt',
          resourceId: t._id?.toString(),
          pendingReceipts: t.pendingReceipts,
          claimStartedAt: oldest,
          // No recorded claim time → the claim predates the field → stale.
          stale: oldest ? new Date(oldest).getTime() < cutoff : true,
        });
      }
      if (
        ['in_transit', 'partially_received'].includes(t.status) &&
        t.cancelClaimId
      ) {
        out.push({
          workflow: 'transfer_cancel',
          resourceId: t._id?.toString(),
          claimId: t.cancelClaimId,
          claimStartedAt: t.cancelStartedAt,
          stale: this.isStale(t.cancelStartedAt, new Date(cutoff)),
        });
      }
    }
    return out;
  }

  // ── internals ──────────────────────────────────────────────────────
  private isStale(startedAt: Date | string | undefined, cutoff: Date): boolean {
    // A claim with no recorded start predates the timestamp field — it is
    // definitionally older than any cutoff.
    if (!startedAt) return true;
    return new Date(startedAt).getTime() < cutoff.getTime();
  }

  private actorFor(transfer: StockTransferDocument): string {
    return (
      transfer.approvedBy?.toString() ??
      transfer.requestedBy?.toString() ??
      NIL_ACTOR
    );
  }

  /**
   * Fail-closed classification: durable-data problems (missing product,
   * not-in-transfer, insufficient source stock, tenant mismatch) need a
   * human; transient errors retry on the next sweep. The claim is never
   * cleared on failure — evidence survives until genuine convergence.
   */
  private classifyError(error: any): RecoveryOutcome {
    const msg: string = error?.message ?? '';
    if (
      /not found|Insufficient stock|not in transfer|not initialized/i.test(msg)
    ) {
      return 'MANUAL_REVIEW_REQUIRED';
    }
    return 'FAILED_RETRYABLE';
  }

  private result(
    base: Omit<RecoveryResult, 'outcome' | 'detail'>,
    outcome: RecoveryOutcome,
    detail?: string,
  ): RecoveryResult {
    const r: RecoveryResult = { ...base, outcome, detail };
    const fields = JSON.stringify({
      workflow: r.workflow,
      resourceId: r.resourceId,
      shopId: r.shopId,
      claimId: r.claimId,
      eventId: r.eventId,
      recoveryAction: 'converge',
      result: outcome,
      detail,
    });
    if (outcome === 'CONVERGED') {
      this.logger.log(fields);
    } else if (outcome !== 'NOT_STALE' && outcome !== 'ALREADY_CONVERGED') {
      this.logger.warn(fields);
    }
    return r;
  }
}
