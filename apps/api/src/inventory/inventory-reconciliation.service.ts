import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  InventoryClaim,
  InventoryClaimDocument,
  InventoryClaimItemState,
  InventoryClaimState,
} from './schemas/inventory-claim.schema';
import { Order, OrderDocument } from '../sales/schemas/order.schema';
import { InventoryService } from './inventory.service';

/**
 * Inventory claim reconciliation (SDV2-005).
 *
 * Recovery state machine (authoritative):
 *   CLAIMING/CLAIMED + committed order  -> HEALTHY_COMMITTED (never mutated)
 *   RELEASED                            -> HEALTHY_RELEASED (terminal)
 *   CLAIMING/CLAIMED without an order   -> RECOVERABLE_ORPHAN -> release
 *   RELEASING with un-restored items    -> RECOVERABLE_PARTIAL_RELEASE
 *   item stuck in RESTORING             -> AMBIGUOUS_MANUAL_REVIEW (never
 *                                          auto-mutated: the stock mutation
 *                                          cannot be proven either way)
 *
 * Concurrency: per-item restoration work is claimed with an atomic
 * conditional update on the claim document, so concurrent workers divide
 * items between them and no item is ever restored twice.
 */
@Injectable()
export class InventoryReconciliationService {
  private readonly logger = new Logger(InventoryReconciliationService.name);
  private readonly isEnabled: boolean;
  private readonly recoveryGraceMs: number;

  constructor(
    @InjectModel(InventoryClaim.name)
    private readonly claimModel: Model<InventoryClaimDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly inventoryService: InventoryService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get('INVENTORY_RECONCILIATION_ENABLED', 'true') === 'true';
    // In-flight protection: a claim younger than the grace window belongs to
    // a checkout that may still be running, so it is never eligible for
    // recovery. State remains authoritative - age is only an eligibility
    // filter, never the classification itself.
    this.recoveryGraceMs = Number(
      this.configService.get('INVENTORY_RECOVERY_GRACE_MS', '120000'),
    );
  }

  private recoveryCutoff(): Date {
    return new Date(Date.now() - this.recoveryGraceMs);
  }

  /**
   * A non-terminal claim inside the grace window may belong to a checkout
   * still in flight - it is not yet classifiable as an orphan.
   */
  private isInFlight(claim: InventoryClaimDocument): boolean {
    const terminal =
      claim.state === InventoryClaimState.COMMITTED ||
      claim.state === InventoryClaimState.RELEASED;
    if (terminal || !claim.createdAt) return false;
    return new Date(claim.createdAt).getTime() > this.recoveryCutoff().getTime();
  }

  /**
   * Read-only inspection: classify every claim for the reconciliation report.
   */
  async inspect(
    shopId?: string,
  ): Promise<{
    healthyCommitted: number;
    healthyReleased: number;
    recoverableOrphan: number;
    partialRelease: number;
    ambiguous: number;
  }> {
    const claims = await this.findClaims(shopId);
    const report = {
      healthyCommitted: 0,
      healthyReleased: 0,
      recoverableOrphan: 0,
      partialRelease: 0,
      ambiguous: 0,
    };

    for (const claim of claims) {
      if (this.isInFlight(claim)) continue; // active checkout, not classifiable
      const classification = await this.classifyClaim(claim);
      switch (classification) {
        case 'HEALTHY_COMMITTED':
          report.healthyCommitted += 1;
          break;
        case 'HEALTHY_RELEASED':
          report.healthyReleased += 1;
          break;
        case 'RECOVERABLE_ORPHAN':
          report.recoverableOrphan += 1;
          break;
        case 'RECOVERABLE_PARTIAL_RELEASE':
          report.partialRelease += 1;
          break;
        default:
          report.ambiguous += 1;
      }
    }

    return report;
  }

  /**
   * Recovery pass over incomplete claims. Idempotent: repeated or concurrent
   * runs restore each item at most once.
   */
  async recoverIncompleteClaims(options?: {
    shopId?: string;
  }): Promise<{ repaired: number; skipped: number; ambiguous: number; errors: number }> {
    const result = { repaired: 0, skipped: 0, ambiguous: 0, errors: 0 };

    const query: Record<string, any> = {
      state: {
        $in: [
          InventoryClaimState.CLAIMING,
          InventoryClaimState.CLAIMED,
          InventoryClaimState.RELEASING,
        ],
      },
      createdAt: { $lt: this.recoveryCutoff() },
    };
    if (options?.shopId) {
      query.shopId = new Types.ObjectId(options.shopId);
    }

    const incomplete = await this.claimModel
      .find(query)
      .sort({ createdAt: 1 })
      .limit(50)
      .exec();

    for (const claim of incomplete) {
      try {
        const outcome = await this.recoverClaim(claim);
        if (outcome === 'repaired' || outcome === 'marked-committed') {
          result.repaired += 1;
        } else if (outcome === 'ambiguous') {
          result.ambiguous += 1;
        } else {
          result.skipped += 1;
        }
      } catch (error: any) {
        this.logger.error(`Recovery failed for claim ${claim._id}: ${error?.message}`);
        result.errors += 1;
      }
    }

    return result;
  }

  private async findClaims(shopId?: string) {
    const query: Record<string, any> = {};
    if (shopId) {
      query.shopId = new Types.ObjectId(shopId);
    }
    return this.claimModel.find(query).exec();
  }

  private async classifyClaim(
    claim: InventoryClaimDocument,
  ): Promise<
    | 'HEALTHY_COMMITTED'
    | 'HEALTHY_RELEASED'
    | 'RECOVERABLE_ORPHAN'
    | 'RECOVERABLE_PARTIAL_RELEASE'
    | 'AMBIGUOUS_MANUAL_REVIEW'
  > {
    switch (claim.state) {
      case InventoryClaimState.COMMITTED:
        return 'HEALTHY_COMMITTED';
      case InventoryClaimState.RELEASED:
        return 'HEALTHY_RELEASED';
      case InventoryClaimState.RELEASING: {
        const hasAmbiguousItem = claim.items.some(
          (item) => item.state === InventoryClaimItemState.RESTORING,
        );
        return hasAmbiguousItem ? 'AMBIGUOUS_MANUAL_REVIEW' : 'RECOVERABLE_PARTIAL_RELEASE';
      }
      case InventoryClaimState.CLAIMING:
      case InventoryClaimState.CLAIMED: {
        if (claim.orderId) {
          // orderId is only ever persisted together with the committed flip,
          // so its presence means an order was saved. Verify it exists.
          const order = await this.orderModel
            .findOne({ _id: claim.orderId, shopId: claim.shopId })
            .exec();
          // Order exists: the reservation is legitimate and must never be
          // restored (crash between order.save and the state flip).
          // Order missing: the record is contradictory - fail safe.
          return order ? 'HEALTHY_COMMITTED' : 'AMBIGUOUS_MANUAL_REVIEW';
        }
        // No order backing this reservation: provably orphaned.
        return 'RECOVERABLE_ORPHAN';
      }
      default:
        return 'AMBIGUOUS_MANUAL_REVIEW';
    }
  }

  /**
   * Recover a single claim according to its state. Never guesses: ambiguous
   * items are classified, never silently mutated.
   */
  private async recoverClaim(
    claim: InventoryClaimDocument,
  ): Promise<'repaired' | 'skipped' | 'marked-committed' | 'ambiguous'> {
    switch (claim.state) {
      case InventoryClaimState.COMMITTED:
      case InventoryClaimState.RELEASED:
        return 'skipped'; // healthy

      case InventoryClaimState.RELEASING: {
        const restored = await this.restoreClaimItems(claim);
        return restored ? 'repaired' : 'skipped';
      }

      case InventoryClaimState.CLAIMING:
      case InventoryClaimState.CLAIMED: {
        if (claim.orderId) {
          // Verify against the authoritative order before closing the claim
          const order = await this.orderModel
            .findOne({ _id: claim.orderId, shopId: claim.shopId })
            .exec();
          if (order) {
            // Order exists but the claim state flip crashed: close it out
            await this.claimModel
              .updateOne(
                { _id: claim._id, state: { $ne: InventoryClaimState.COMMITTED } },
                { $set: { state: InventoryClaimState.COMMITTED } },
              )
              .exec();
            return 'marked-committed';
          }
          // orderId was persisted but the order is gone: contradictory
          // evidence - classify for manual review, never guess.
          return 'ambiguous';
        }

        // Orphan: no order backs this reservation. Atomically take the
        // recovery work so concurrent workers cannot double-repair. The
        // grace filter keeps in-flight checkouts untouchable.
        const claimed = await this.claimModel
          .findOneAndUpdate(
            {
              _id: claim._id,
              state: { $in: [InventoryClaimState.CLAIMING, InventoryClaimState.CLAIMED] },
              createdAt: { $lt: this.recoveryCutoff() },
            },
            { $set: { state: InventoryClaimState.RELEASING } },
            { new: true },
          )
          .exec();

        if (!claimed) {
          return 'skipped'; // another worker won the recovery claim
        }

        const restored = await this.restoreClaimItems(claimed);
        return restored ? 'repaired' : 'skipped';
      }
      default:
        return 'ambiguous';
    }
  }

  /**
   * Restore every un-restored item of a claim, exactly once per item.
   * Per-item work is claimed with an atomic conditional update, so concurrent
   * workers divide items between them and no item is restored twice.
   * Items stuck in RESTORING are skipped (ambiguous) and reported.
   */
  private async restoreClaimItems(claim: InventoryClaimDocument): Promise<boolean> {
    let restoredAny = false;

    for (const item of claim.items) {
      if (item.state === InventoryClaimItemState.RESTORING) {
        this.logger.error(
          `Claim ${claim._id} item ${item.productId} stuck in restoring state - manual review required`,
        );
        continue;
      }
      if (item.state === InventoryClaimItemState.PENDING) {
        // The durable mutation receipt is written atomically with the stock
        // decrement, so it decides definitively: present = decrement proven
        // (restore it), absent = decrement never landed (resolved, skip).
        const decrementProven =
          !!item.mutationId &&
          (await this.inventoryService.hasClaimMutation(
            claim.shopId.toString(),
            item.productId,
            item.mutationId,
          ));
        if (!decrementProven) continue;
      } else if (item.state !== InventoryClaimItemState.CLAIMED) {
        continue;
      }

      // Atomic per-item work claim
      const workClaim = await this.claimModel
        .updateOne(
          {
            _id: claim._id,
            items: { $elemMatch: { productId: item.productId, state: item.state } },
          },
          { $set: { 'items.$.state': InventoryClaimItemState.RESTORING } },
        )
        .exec();

      if (!workClaim.modifiedCount) {
        continue; // another worker already took this item
      }

      await this.inventoryService.updateStock(
        claim.shopId.toString(),
        item.productId,
        item.quantity,
      );
      await this.inventoryService.createStockAdjustment(
        claim.shopId.toString(),
        item.productId,
        item.quantity,
        'correction',
        claim.claimedBy.toString(),
        `Reservation release for order ${claim.orderNumber} - ${item.name} x${item.quantity}`,
      );

      await this.claimModel
        .updateOne(
          {
            _id: claim._id,
            items: { $elemMatch: { productId: item.productId, state: InventoryClaimItemState.RESTORING } },
          },
          { $set: { 'items.$.state': InventoryClaimItemState.RESTORED } },
        )
        .exec();
      if (item.mutationId) {
        try {
          await this.inventoryService.clearClaimMutation(
            claim.shopId.toString(),
            item.productId,
            item.mutationId,
          );
        } catch {
          // Receipt residue is swept on the next pass; never blocks release.
        }
      }
      restoredAny = true;
    }

    // Finalize when every item is resolved: RESTORED items were released,
    // PENDING items were never durably claimed (never auto-restored - a
    // decrement cannot be proven, and phantom restores risk oversell).
    const fresh = await this.claimModel.findById(claim._id).exec();
    if (
      fresh &&
      fresh.items.every(
        (item) =>
          item.state === InventoryClaimItemState.RESTORED ||
          item.state === InventoryClaimItemState.PENDING,
      )
    ) {
      await this.claimModel
        .updateOne(
          { _id: fresh._id, state: InventoryClaimState.RELEASING },
          { $set: { state: InventoryClaimState.RELEASED } },
        )
        .exec();
    }

    return restoredAny;
  }

  /**
   * Sweep durable mutation receipts left on product documents. Every
   * receipt is a proven decrement; each is resolved against its claim:
   *
   *   item CLAIMED/RESTORED          -> residue, pull the receipt
   *   item PENDING (non-committed)   -> proven decrement, restore + pull
   *   item PENDING + COMMITTED claim -> contradictory, ambiguous
   *   item RESTORING / missing claim -> ambiguous, never guessed
   *
   * This also closes the pathological edge where a decrement lands after
   * its claim already finalized (a >grace-window checkout): the receipt
   * still proves the decrement and the stock is restored.
   */
  async sweepClaimMutations(shopId?: string): Promise<{
    resolved: number;
    cleared: number;
    ambiguous: number;
    errors: number;
  }> {
    const result = { resolved: 0, cleared: 0, ambiguous: 0, errors: 0 };
    const products = await this.inventoryService.findProductsWithClaimMutations(shopId);

    for (const product of products) {
      for (const marker of product.claimMutations ?? []) {
        try {
          const claim = await this.claimModel
            .findOne({ _id: marker.claimId, shopId: product.shopId })
            .exec();
          const item = claim?.items.find((i) => i.mutationId === marker.mutationId);

          if (!claim || !item) {
            this.logger.error(
              `Mutation receipt ${marker.mutationId} on product ${product._id} has no matching claim item - manual review required`,
            );
            result.ambiguous += 1;
            continue;
          }
          if (this.isInFlight(claim)) continue; // live checkout owns it

          if (
            item.state === InventoryClaimItemState.CLAIMED ||
            item.state === InventoryClaimItemState.RESTORED
          ) {
            // Item resolved durably; the receipt is residue - pull it.
            await this.inventoryService.clearClaimMutation(
              product.shopId.toString(),
              product._id.toString(),
              marker.mutationId,
            );
            result.cleared += 1;
            continue;
          }

          if (item.state === InventoryClaimItemState.RESTORING) {
            this.logger.error(
              `Mutation receipt ${marker.mutationId} item ${item.productId} stuck in restoring state - manual review required`,
            );
            result.ambiguous += 1;
            continue;
          }

          if (item.state === InventoryClaimItemState.PENDING) {
            if (claim.state === InventoryClaimState.COMMITTED) {
              this.logger.error(
                `Committed claim ${claim._id} has pending item ${item.productId} with a proven decrement - manual review required`,
              );
              result.ambiguous += 1;
              continue;
            }

            // Proven decrement on an unresolved claim: restore exactly once.
            const workClaim = await this.claimModel
              .updateOne(
                {
                  _id: claim._id,
                  items: {
                    $elemMatch: {
                      productId: item.productId,
                      state: InventoryClaimItemState.PENDING,
                    },
                  },
                },
                { $set: { 'items.$.state': InventoryClaimItemState.RESTORING } },
              )
              .exec();
            if (!workClaim.modifiedCount) continue; // another worker took it

            await this.inventoryService.updateStock(
              product.shopId.toString(),
              item.productId,
              item.quantity,
            );
            await this.inventoryService.createStockAdjustment(
              product.shopId.toString(),
              item.productId,
              item.quantity,
              'correction',
              claim.claimedBy.toString(),
              `Recovered decrement for order ${claim.orderNumber} - ${item.name} x${item.quantity}`,
            );
            await this.claimModel
              .updateOne(
                {
                  _id: claim._id,
                  items: {
                    $elemMatch: {
                      productId: item.productId,
                      state: InventoryClaimItemState.RESTORING,
                    },
                  },
                },
                { $set: { 'items.$.state': InventoryClaimItemState.RESTORED } },
              )
              .exec();
            await this.inventoryService.clearClaimMutation(
              product.shopId.toString(),
              product._id.toString(),
              marker.mutationId,
            );
            result.resolved += 1;
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to resolve mutation receipt ${marker.mutationId}: ${error?.message}`,
          );
          result.errors += 1;
        }
      }
    }

    return result;
  }

  /**
   * Scheduled reconciliation pass (guarded by INVENTORY_RECONCILIATION_ENABLED).
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledReconciliation(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const result = await this.recoverIncompleteClaims();
      if (
        result.repaired > 0 ||
        result.skipped > 0 ||
        result.ambiguous > 0 ||
        result.errors > 0
      ) {
        this.logger.log(
          `Inventory reconciliation: repaired=${result.repaired} skipped=${result.skipped} ambiguous=${result.ambiguous} errors=${result.errors}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Inventory reconciliation run failed: ${error?.message}`);
    }

    try {
      const sweep = await this.sweepClaimMutations();
      if (
        sweep.resolved > 0 ||
        sweep.cleared > 0 ||
        sweep.ambiguous > 0 ||
        sweep.errors > 0
      ) {
        this.logger.log(
          `Mutation receipt sweep: resolved=${sweep.resolved} cleared=${sweep.cleared} ambiguous=${sweep.ambiguous} errors=${sweep.errors}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Mutation receipt sweep failed: ${error?.message}`);
    }
  }
}
