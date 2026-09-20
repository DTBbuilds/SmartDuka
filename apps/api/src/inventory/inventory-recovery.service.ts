import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import {
  InventoryClaim,
  InventoryClaimDocument,
  InventoryClaimItem,
  InventoryClaimItemState,
  InventoryClaimState,
  RecoveryResolutionAction,
  RecoveryResolutionStatus,
} from './schemas/inventory-claim.schema';
import { Order, OrderDocument } from '../sales/schemas/order.schema';
import { InventoryService } from './inventory.service';

/**
 * Operator-facing ambiguous-state resolution (SDV2-006).
 *
 * SDV2-005 deliberately refuses to auto-mutate ambiguous states. This service
 * makes those states visible, classifiable, tenant-isolated, auditable, and
 * safely resolvable exactly once:
 *
 *   RESTORE_STOCK          - evidence-backed stock correction
 *   ACCEPT_CURRENT_STOCK   - zero-mutation acceptance of persisted state
 *   escalate (addNote)     - records investigation, leaves the case open
 *
 * Exactly-once: resolution work is claimed by an atomic conditional update
 * ('resolving'), and every restore carries a durable restore receipt pushed
 * atomically with the +quantity mutation (kind 'restore'). A crash mid-
 * resolution is therefore provable on restart and resumable without a second
 * stock mutation.
 */
export type RecoveryCaseReason =
  | 'STUCK_RESTORING'
  | 'CLAIM_WITH_MISSING_ORDER'
  | 'UNKNOWN_CLAIM_STATE'
  | 'UNMATCHED_MUTATION_RECEIPT'
  | 'COMMITTED_PENDING_WITH_RECEIPT'
  | 'COMMITTED_PENDING_NO_RECEIPT'
  | 'RESOLUTION_IN_PROGRESS';

export interface RecoveryCase {
  caseId: string;
  kind: 'claim' | 'claim_item' | 'mutation_receipt';
  reasonCode: RecoveryCaseReason;
  claimId?: string;
  orderNumber?: string;
  orderId?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  mutationId?: string;
  claimState?: string;
  itemState?: string;
  resolutionStatus?: string;
  createdAt?: Date;
}

@Injectable()
export class InventoryRecoveryService {
  private readonly logger = new Logger(InventoryRecoveryService.name);
  private readonly recoveryGraceMs: number;

  constructor(
    @InjectModel(InventoryClaim.name)
    private readonly claimModel: Model<InventoryClaimDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly inventoryService: InventoryService,
    private readonly configService: ConfigService,
  ) {
    this.recoveryGraceMs = Number(
      this.configService.get('INVENTORY_RECOVERY_GRACE_MS', '120000'),
    );
  }

  private recoveryCutoff(): Date {
    return new Date(Date.now() - this.recoveryGraceMs);
  }

  /** Same in-flight rule as reconciliation: young non-terminal claims are live checkouts. */
  private isInFlight(claim: InventoryClaimDocument): boolean {
    const terminal =
      claim.state === InventoryClaimState.COMMITTED ||
      claim.state === InventoryClaimState.RELEASED ||
      claim.state === InventoryClaimState.RESOLVED;
    if (terminal || !claim.createdAt) return false;
    return new Date(claim.createdAt).getTime() > this.recoveryCutoff().getTime();
  }

  /**
   * Enumerate every unresolved ambiguous recovery case for a shop.
   * Live/in-grace claims are never presented as actionable.
   */
  async listCases(shopId: string): Promise<RecoveryCase[]> {
    const cases: RecoveryCase[] = [];
    const seen = new Set<string>();
    const shopObjId = new Types.ObjectId(shopId);

    const claims = await this.claimModel
      .find({
        shopId: shopObjId,
        $or: [
          {
            state: {
              $in: [
                InventoryClaimState.CLAIMING,
                InventoryClaimState.CLAIMED,
                InventoryClaimState.RELEASING,
              ],
            },
          },
          // Committed claims only surface when a PENDING item flag crashed
          {
            state: InventoryClaimState.COMMITTED,
            items: {
              $elemMatch: {
                state: InventoryClaimItemState.PENDING,
                'resolution.status': { $ne: RecoveryResolutionStatus.RESOLVED },
              },
            },
          },
        ],
      })
      .sort({ createdAt: 1 })
      .exec();

    for (const claim of claims) {
      if (this.isInFlight(claim)) continue;

      const knownStates: string[] = Object.values(InventoryClaimState);
      if (!knownStates.includes(claim.state)) {
        cases.push(this.claimCase(claim, 'UNKNOWN_CLAIM_STATE'));
        continue;
      }

      if (
        (claim.state === InventoryClaimState.CLAIMING ||
          claim.state === InventoryClaimState.CLAIMED) &&
        claim.orderId
      ) {
        const order = await this.orderModel
          .findOne({ _id: claim.orderId, shopId: shopObjId })
          .exec();
        if (!order) {
          // orderId persisted but the order is gone - contradictory evidence.
          const c = this.claimCase(
            claim,
            claim.resolution?.status === RecoveryResolutionStatus.RESOLVING
              ? 'RESOLUTION_IN_PROGRESS'
              : 'CLAIM_WITH_MISSING_ORDER',
          );
          c.resolutionStatus = claim.resolution?.status;
          cases.push(c);
        }
      }

      for (const item of claim.items) {
        if (item.resolution?.status === RecoveryResolutionStatus.RESOLVED) {
          continue; // operator-resolved evidence, preserved but closed
        }
        if (item.state === InventoryClaimItemState.RESTORING) {
          const reasonCode: RecoveryCaseReason =
            item.resolution?.status === RecoveryResolutionStatus.RESOLVING
              ? 'RESOLUTION_IN_PROGRESS'
              : 'STUCK_RESTORING';
          const c = this.itemCase(claim, item, reasonCode);
          seen.add(c.caseId);
          cases.push(c);
        } else if (
          claim.state === InventoryClaimState.COMMITTED &&
          item.state === InventoryClaimItemState.PENDING
        ) {
          // Committed order with an item flag crash: the mutation receipt
          // decides whether the decrement durably landed.
          const proven =
            !!item.mutationId &&
            (await this.inventoryService.hasClaimMutation(
              shopId,
              item.productId,
              item.mutationId,
            ));
          const reasonCode: RecoveryCaseReason =
            item.resolution?.status === RecoveryResolutionStatus.RESOLVING
              ? 'RESOLUTION_IN_PROGRESS'
              : proven
                ? 'COMMITTED_PENDING_WITH_RECEIPT'
                : 'COMMITTED_PENDING_NO_RECEIPT';
          const c = this.itemCase(claim, item, reasonCode);
          c.resolutionStatus = item.resolution?.status;
          (c as any).decrementProven = proven;
          seen.add(c.caseId);
          cases.push(c);
        }
      }
    }

    // Mutation receipts: any receipt that cannot be attributed to a live,
    // consistent claim item is an orphan case.
    const products =
      await this.inventoryService.findProductsWithClaimMutations(shopId);
    for (const product of products) {
      for (const marker of product.claimMutations ?? []) {
        try {
          const claim = marker.claimId
            ? await this.claimModel
                .findOne({ _id: marker.claimId, shopId: shopObjId })
                .exec()
            : null;
          const item = claim?.items.find(
            (i) =>
              i.mutationId === marker.mutationId ||
              i.resolution?.mutationId === marker.mutationId,
          );

          if (marker.kind === 'restore') {
            // A restore receipt proves the operator restore landed. If its
            // claim-side resolution record still says 'resolving', the sweep
            // finalizes it - transient residue, not an operator case.
            if (item && item.resolution?.status === RecoveryResolutionStatus.RESOLVING) {
              continue;
            }
            if (item && item.resolution?.status === RecoveryResolutionStatus.RESOLVED) {
              continue;
            }
            // Restore receipt without its resolution context: unexplainable.
            cases.push(this.receiptCase(product, marker, 'UNMATCHED_MUTATION_RECEIPT'));
            continue;
          }

          if (!claim || !item) {
            const c = this.receiptCase(product, marker, 'UNMATCHED_MUTATION_RECEIPT');
            if (marker.resolution?.status === RecoveryResolutionStatus.RESOLVING) {
              c.reasonCode = 'RESOLUTION_IN_PROGRESS';
              c.resolutionStatus = marker.resolution.status;
            }
            cases.push(c);
            continue;
          }
          if (this.isInFlight(claim)) continue;
          // Matched items are covered by the claim scan above (dedupe on key),
          // and CLAIMED/RESTORED residue is cleared automatically by the sweep.
          const key = `claim_item:${claim._id}:${item.productId}`;
          if (item.state === InventoryClaimItemState.RESTORING && !seen.has(key)) {
            seen.add(key);
            cases.push(this.itemCase(claim, item, 'STUCK_RESTORING'));
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to classify mutation receipt ${marker.mutationId}: ${error?.message}`,
          );
        }
      }
    }

    return cases;
  }

  /** Operational metrics over unresolved recovery health. */
  async getMetrics(shopId: string): Promise<Record<string, any>> {
    const cases = await this.listCases(shopId);
    const now = Date.now();
    const byReason: Record<string, number> = {};
    let oldest: number | null = null;
    let stuckRestoring = 0;
    let unmatchedReceipts = 0;
    let inProgress = 0;

    for (const c of cases) {
      byReason[c.reasonCode] = (byReason[c.reasonCode] ?? 0) + 1;
      if (c.reasonCode === 'STUCK_RESTORING') stuckRestoring += 1;
      if (c.reasonCode === 'UNMATCHED_MUTATION_RECEIPT') unmatchedReceipts += 1;
      if (c.reasonCode === 'RESOLUTION_IN_PROGRESS') inProgress += 1;
      if (c.createdAt) {
        const age = now - new Date(c.createdAt).getTime();
        if (oldest === null || age > oldest) oldest = age;
      }
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const shopObjId = new Types.ObjectId(shopId);
    const resolvedClaimsToday = await this.claimModel.countDocuments({
      shopId: shopObjId,
      'resolution.status': RecoveryResolutionStatus.RESOLVED,
      'resolution.resolvedAt': { $gte: dayStart },
    });
    const resolvedItemsToday = await this.claimModel.countDocuments({
      shopId: shopObjId,
      items: {
        $elemMatch: {
          'resolution.status': RecoveryResolutionStatus.RESOLVED,
          'resolution.resolvedAt': { $gte: dayStart },
        },
      },
    });
    // Receipt-level resolutions are audited via tagged correction adjustments.
    const resolvedReceiptsToday =
      await this.inventoryService.countResolutionAdjustments(shopId, dayStart);

    return {
      unresolvedCases: cases.length,
      oldestUnresolvedAgeMs: oldest,
      stuckRestoringItems: stuckRestoring,
      unmatchedReceipts,
      resolutionsInProgress: inProgress,
      resolvedToday:
        resolvedClaimsToday + resolvedItemsToday + resolvedReceiptsToday,
      byReason,
    };
  }

  /**
   * Resolve an ambiguous case. Tenant scope comes from the authenticated
   * user's shop; the claim is verified against it before any mutation.
   */
  async resolveCase(
    shopId: string,
    userId: string,
    dto: {
      kind: 'claim' | 'claim_item' | 'mutation_receipt';
      claimId?: string;
      productId?: string;
      mutationId?: string;
      action: RecoveryResolutionAction;
      reason: string;
    },
  ): Promise<Record<string, any>> {
    switch (dto.kind) {
      case 'claim_item':
        return this.resolveClaimItem(shopId, userId, dto);
      case 'claim':
        return this.resolveClaim(shopId, userId, dto);
      case 'mutation_receipt':
        return this.resolveReceipt(shopId, userId, dto);
      default:
        throw new BadRequestException(`Unknown case kind`);
    }
  }

  /** Append an investigation note without closing the case (escalation). */
  async addNote(
    shopId: string,
    userId: string,
    claimId: string,
    text: string,
  ): Promise<Record<string, any>> {
    if (!text?.trim()) {
      throw new BadRequestException('Note text is required');
    }
    const result = await this.claimModel
      .updateOne(
        { _id: new Types.ObjectId(claimId), shopId: new Types.ObjectId(shopId) },
        {
          $push: {
            notes: {
              text: text.trim(),
              notedBy: new Types.ObjectId(userId),
              notedAt: new Date(),
            },
          },
        },
      )
      .exec();
    if (!result.matchedCount) {
      throw new NotFoundException('Claim not found');
    }
    return { noted: true, claimId };
  }

  // ---------------------------------------------------------------------
  // Item-level resolution (STUCK_RESTORING, COMMITTED_PENDING_WITH_RECEIPT)
  // ---------------------------------------------------------------------

  private async resolveClaimItem(
    shopId: string,
    userId: string,
    dto: {
      claimId?: string;
      productId?: string;
      action: RecoveryResolutionAction;
      reason: string;
    },
  ): Promise<Record<string, any>> {
    if (!dto.claimId || !dto.productId) {
      throw new BadRequestException('claimId and productId are required');
    }
    const shopObjId = new Types.ObjectId(shopId);
    const claim = await this.claimModel
      .findOne({ _id: new Types.ObjectId(dto.claimId), shopId: shopObjId })
      .exec();
    if (!claim) throw new NotFoundException('Recovery case not found');
    if (this.isInFlight(claim)) {
      throw new ConflictException('Claim belongs to an in-flight checkout');
    }
    if (claim.state === InventoryClaimState.RESOLVED) {
      throw new ConflictException('Case already resolved');
    }
    const item = claim.items.find((i) => i.productId === dto.productId);
    if (!item) throw new NotFoundException('Claim item not found');
    if (item.resolution?.status === RecoveryResolutionStatus.RESOLVED) {
      throw new ConflictException('Case already resolved');
    }
    if (
      item.resolution?.status === RecoveryResolutionStatus.RESOLVING &&
      item.resolution.action !== dto.action
    ) {
      throw new ConflictException(
        `Conflicting action: resolution already in progress as ${item.resolution.action}`,
      );
    }

    const committedPending =
      claim.state === InventoryClaimState.COMMITTED &&
      item.state === InventoryClaimItemState.PENDING;
    const decrementProven =
      committedPending &&
      !!item.mutationId &&
      (await this.inventoryService.hasClaimMutation(
        shopId,
        item.productId,
        item.mutationId,
      ));
    const resumable =
      item.resolution?.status === RecoveryResolutionStatus.RESOLVING;
    const ambiguous =
      item.state === InventoryClaimItemState.RESTORING ||
      committedPending ||
      resumable;
    if (!ambiguous) {
      throw new BadRequestException(
        'Item is not in a resolvable ambiguous state',
      );
    }
    if (
      dto.action === RecoveryResolutionAction.RESTORE_STOCK &&
      committedPending &&
      !decrementProven
    ) {
      throw new BadRequestException(
        'No decrement evidence for this item - restoring would create phantom stock',
      );
    }

    if (dto.action === RecoveryResolutionAction.ACCEPT_CURRENT_STOCK) {
      return this.acceptClaimItem(
        claim,
        item,
        shopId,
        userId,
        dto.reason,
        decrementProven,
      );
    }
    return this.restoreClaimItem(claim, item, shopId, userId, dto.reason);
  }

  /**
   * RESTORE_STOCK on an ambiguous item: restore exactly once. The restore
   * carries a durable restore receipt pushed atomically with the +qty update;
   * a retried restore with the same mutationId is rejected by the receipt
   * filter, so concurrent/crashed retries can never double-restore.
   */
  private async restoreClaimItem(
    claim: InventoryClaimDocument,
    item: InventoryClaimItem,
    shopId: string,
    userId: string,
    reason: string,
  ): Promise<Record<string, any>> {
    const claimId = claim._id.toString();
    let restoreMutationId = item.resolution?.mutationId;

    if (item.resolution?.status === RecoveryResolutionStatus.RESOLVING) {
      if (!restoreMutationId) {
        throw new ConflictException(
          'Resolution in progress without mutation identity - manual review required',
        );
      }
    } else {
      // Atomic work claim: first resolver wins; the resolution record exists
      // BEFORE any stock mutation so a crash leaves inspectable evidence.
      restoreMutationId = `restore-${nanoid()}`;
      const workClaim = await this.claimModel
        .updateOne(
          {
            _id: claim._id,
            shopId: claim.shopId,
            items: {
              $elemMatch: {
                productId: item.productId,
                state: item.state,
                'resolution': { $exists: false },
              },
            },
          },
          {
            $set: {
              'items.$.resolution': {
                status: RecoveryResolutionStatus.RESOLVING,
                action: RecoveryResolutionAction.RESTORE_STOCK,
                mutationId: restoreMutationId,
                resolvedBy: new Types.ObjectId(userId),
                resolvedAt: new Date(),
                reason,
              },
            },
          },
        )
        .exec();
      if (!workClaim.modifiedCount) {
        throw new ConflictException(
          'Case is already being resolved or was resolved',
        );
      }
    }

    // Idempotent restore: the receipt-exclusion filter makes a duplicate
    // mutationId a no-op (returns null with the receipt present).
    const restored = await this.inventoryService.updateStock(
      shopId,
      item.productId,
      item.quantity,
      { mutationId: restoreMutationId, claimId, kind: 'restore' },
    );
    if (!restored) {
      const landed = await this.inventoryService.hasClaimMutation(
        shopId,
        item.productId,
        restoreMutationId,
      );
      if (!landed) {
        throw new BadRequestException(
          'Stock restore failed - case remains open for retry',
        );
      }
      // Restore already applied (retry after crash): fall through to finalize.
    }

    await this.writeResolutionAdjustment(
      shopId,
      item.productId,
      item.quantity,
      userId,
      `Manual resolution for order ${claim.orderNumber} - ${item.name} x${item.quantity} (mutation ${restoreMutationId}): ${reason}`,
    );

    // Finalize: item -> RESTORED, resolution -> resolved (guarded on the
    // resolution identity so a stale writer cannot overwrite a newer claim).
    await this.claimModel
      .updateOne(
        {
          _id: claim._id,
          shopId: claim.shopId,
          items: {
            $elemMatch: {
              productId: item.productId,
              'resolution.mutationId': restoreMutationId,
              'resolution.status': RecoveryResolutionStatus.RESOLVING,
            },
          },
        },
        {
          $set: {
            'items.$.state': InventoryClaimItemState.RESTORED,
            'items.$.resolution.status': RecoveryResolutionStatus.RESOLVED,
          },
        },
      )
      .exec();

    // Pull durable receipts: the restore receipt and any leftover decrement
    // receipt for this item (PENDING->RESTORING proven-decrement path).
    await this.inventoryService
      .clearClaimMutations(
        shopId,
        item.productId,
        [restoreMutationId, item.mutationId].filter(Boolean) as string[],
      )
      .catch(() => undefined);

    await this.finalizeReleasedClaim(claim._id, shopId);

    return {
      resolved: true,
      action: RecoveryResolutionAction.RESTORE_STOCK,
      claimId,
      productId: item.productId,
      quantityRestored: item.quantity,
    };
  }

  /**
   * ACCEPT_CURRENT_STOCK: zero stock mutation. For a RESTORING item the
   * operator confirms the restoration already landed; for a committed
   * PENDING+receipt item the operator confirms the decrement was legitimate
   * (the CLAIMED flag crashed). Evidence is preserved on the resolution record.
   */
  private async acceptClaimItem(
    claim: InventoryClaimDocument,
    item: InventoryClaimItem,
    shopId: string,
    userId: string,
    reason: string,
    decrementProven: boolean,
  ): Promise<Record<string, any>> {
    const targetState =
      claim.state === InventoryClaimState.COMMITTED &&
      item.state === InventoryClaimItemState.PENDING
        ? decrementProven
          ? InventoryClaimItemState.CLAIMED // decrement legit; flag crashed
          : InventoryClaimItemState.PENDING // no decrement - evidence stays
        : InventoryClaimItemState.RESTORED;

    const update = await this.claimModel
      .updateOne(
        {
          _id: claim._id,
          shopId: claim.shopId,
          items: {
            $elemMatch: {
              productId: item.productId,
              state: item.state,
              'resolution.status': { $ne: RecoveryResolutionStatus.RESOLVED },
            },
          },
        },
        {
          $set: {
            'items.$.state': targetState,
            'items.$.resolution': {
              status: RecoveryResolutionStatus.RESOLVED,
              action: RecoveryResolutionAction.ACCEPT_CURRENT_STOCK,
              resolvedBy: new Types.ObjectId(userId),
              resolvedAt: new Date(),
              reason,
            },
          },
        },
      )
      .exec();
    if (!update.modifiedCount) {
      throw new ConflictException('Case is already resolved or changed');
    }

    // The decrement receipt is resolved evidence - pull it (idempotent).
    if (item.mutationId) {
      await this.inventoryService
        .clearClaimMutation(shopId, item.productId, item.mutationId)
        .catch(() => undefined);
    }

    await this.finalizeReleasedClaim(claim._id, shopId);

    return {
      resolved: true,
      action: RecoveryResolutionAction.ACCEPT_CURRENT_STOCK,
      claimId: claim._id.toString(),
      productId: item.productId,
      quantityRestored: 0,
    };
  }

  // ---------------------------------------------------------------------
  // Claim-level resolution (CLAIM_WITH_MISSING_ORDER)
  // ---------------------------------------------------------------------

  private async resolveClaim(
    shopId: string,
    userId: string,
    dto: {
      claimId?: string;
      action: RecoveryResolutionAction;
      reason: string;
    },
  ): Promise<Record<string, any>> {
    if (!dto.claimId) throw new BadRequestException('claimId is required');
    const shopObjId = new Types.ObjectId(shopId);
    const claim = await this.claimModel
      .findOne({ _id: new Types.ObjectId(dto.claimId), shopId: shopObjId })
      .exec();
    if (!claim) throw new NotFoundException('Recovery case not found');
    if (this.isInFlight(claim)) {
      throw new ConflictException('Claim belongs to an in-flight checkout');
    }
    if (claim.resolution?.status === RecoveryResolutionStatus.RESOLVED) {
      throw new ConflictException('Case already resolved');
    }
    if (
      claim.resolution?.status === RecoveryResolutionStatus.RESOLVING &&
      claim.resolution.action !== dto.action
    ) {
      throw new ConflictException(
        `Conflicting action: resolution already in progress as ${claim.resolution.action}`,
      );
    }
    const ambiguous =
      claim.resolution?.status === RecoveryResolutionStatus.RESOLVING ||
      ((claim.state === InventoryClaimState.CLAIMING ||
        claim.state === InventoryClaimState.CLAIMED) &&
        !!claim.orderId &&
        !(await this.orderModel
          .findOne({ _id: claim.orderId, shopId: shopObjId })
          .exec()));
    if (!ambiguous) {
      throw new BadRequestException(
        'Claim is not in a resolvable ambiguous state',
      );
    }

    if (dto.action === RecoveryResolutionAction.ACCEPT_CURRENT_STOCK) {
      // Refuse to close a claim that still has item-level ambiguity: those
      // items keep their own cases until resolved.
      if (
        claim.items.some(
          (i) =>
            i.state === InventoryClaimItemState.RESTORING &&
            i.resolution?.status !== RecoveryResolutionStatus.RESOLVED,
        )
      ) {
        throw new BadRequestException(
          'Claim has items stuck in restoring - resolve the item cases first',
        );
      }
      // Terminal manual resolution: evidence preserved, reconciliation never
      // re-opens it (RESOLVED is not in the recovery discovery set).
      const update = await this.claimModel
        .updateOne(
          {
            _id: claim._id,
            shopId: shopObjId,
            'resolution.status': { $ne: RecoveryResolutionStatus.RESOLVED },
          },
          {
            $set: {
              state: InventoryClaimState.RESOLVED,
              resolution: {
                status: RecoveryResolutionStatus.RESOLVED,
                action: RecoveryResolutionAction.ACCEPT_CURRENT_STOCK,
                resolvedBy: new Types.ObjectId(userId),
                resolvedAt: new Date(),
                reason: dto.reason,
              },
            },
          },
        )
        .exec();
      if (!update.modifiedCount) {
        throw new ConflictException('Case is already resolved');
      }
      return {
        resolved: true,
        action: RecoveryResolutionAction.ACCEPT_CURRENT_STOCK,
        claimId: claim._id.toString(),
        quantityRestored: 0,
      };
    }

    // RESTORE_STOCK: take the claim into RELEASING with a resolution record,
    // then restore each provable item exactly once.
    if (claim.resolution?.status !== RecoveryResolutionStatus.RESOLVING) {
      const claimed = await this.claimModel
        .findOneAndUpdate(
          {
            _id: claim._id,
            shopId: shopObjId,
            state: {
              $in: [
                InventoryClaimState.CLAIMING,
                InventoryClaimState.CLAIMED,
              ],
            },
            'resolution.status': { $ne: RecoveryResolutionStatus.RESOLVED },
          },
          {
            $set: {
              state: InventoryClaimState.RELEASING,
              resolution: {
                status: RecoveryResolutionStatus.RESOLVING,
                action: RecoveryResolutionAction.RESTORE_STOCK,
                resolvedBy: new Types.ObjectId(userId),
                resolvedAt: new Date(),
                reason: dto.reason,
              },
            },
          },
          { new: true },
        )
        .exec();
      if (!claimed) {
        throw new ConflictException(
          'Case is already being resolved or was resolved',
        );
      }
    }

    let restored = 0;
    const fresh = await this.claimModel.findById(claim._id).exec();
    for (const item of fresh?.items ?? []) {
      if (item.state === InventoryClaimItemState.RESTORING) {
        // Per-item ambiguity stays an item-level case - never guessed.
        continue;
      }
      const provable =
        item.state === InventoryClaimItemState.CLAIMED ||
        (item.state === InventoryClaimItemState.PENDING &&
          !!item.mutationId &&
          (await this.inventoryService.hasClaimMutation(
            shopId,
            item.productId,
            item.mutationId,
          )));
      if (!provable) continue;
      try {
        await this.restoreClaimItem(fresh!, item, shopId, userId, dto.reason);
        restored += 1;
      } catch (error: any) {
        this.logger.error(
          `Claim ${claim._id} item ${item.productId} resolution failed: ${error?.message}`,
        );
      }
    }

    await this.claimModel
      .updateOne(
        {
          _id: claim._id,
          'resolution.status': RecoveryResolutionStatus.RESOLVING,
        },
        {
          $set: {
            'resolution.status': RecoveryResolutionStatus.RESOLVED,
          },
        },
      )
      .exec();
    await this.finalizeReleasedClaim(claim._id, shopId);

    return {
      resolved: true,
      action: RecoveryResolutionAction.RESTORE_STOCK,
      claimId: claim._id.toString(),
      quantityRestored: restored,
    };
  }

  // ---------------------------------------------------------------------
  // Unmatched mutation receipts
  // ---------------------------------------------------------------------

  private async resolveReceipt(
    shopId: string,
    userId: string,
    dto: {
      productId?: string;
      mutationId?: string;
      action: RecoveryResolutionAction;
      reason: string;
    },
  ): Promise<Record<string, any>> {
    if (!dto.productId || !dto.mutationId) {
      throw new BadRequestException('productId and mutationId are required');
    }
    const marker = await this.inventoryService.getClaimMutation(
      shopId,
      dto.productId,
      dto.mutationId,
    );
    if (!marker) throw new NotFoundException('Mutation receipt not found');
    if (marker.kind === 'restore') {
      throw new BadRequestException(
        'Restore receipts are finalized by reconciliation, not resolvable',
      );
    }
    if (marker.resolution?.status === 'resolved') {
      throw new ConflictException('Case already resolved');
    }

    // Verify it is genuinely unmatched before allowing operator action.
    const claim = marker.claimId
      ? await this.claimModel
          .findOne({
            _id: marker.claimId,
            shopId: new Types.ObjectId(shopId),
          })
          .exec()
      : null;
    const item = claim?.items.find(
      (i) => i.mutationId === dto.mutationId,
    );
    if (claim && item) {
      throw new BadRequestException(
        'Receipt matches a claim item - resolve the claim item case instead',
      );
    }
    if (claim && this.isInFlight(claim)) {
      throw new ConflictException('Receipt belongs to an in-flight checkout');
    }

    if (marker.resolution?.status !== 'resolving') {
      // Atomic work claim on the receipt itself (same document domain as the
      // stock mutation, so exactly-once is enforceable).
      const restoreMutationId = `restore-${nanoid()}`;
      const claimed = await this.inventoryService.claimMutationForResolution(
        shopId,
        dto.productId,
        dto.mutationId,
        {
          status: 'resolving',
          action: dto.action,
          mutationId:
            dto.action === RecoveryResolutionAction.RESTORE_STOCK
              ? restoreMutationId
              : undefined,
          resolvedBy: new Types.ObjectId(userId),
          resolvedAt: new Date(),
          reason: dto.reason,
        },
      );
      if (!claimed) {
        throw new ConflictException(
          'Case is already being resolved or was resolved',
        );
      }
      if (dto.action === RecoveryResolutionAction.ACCEPT_CURRENT_STOCK) {
        return this.finalizeReceiptResolution(shopId, dto, userId, marker, 0);
      }
      return this.performReceiptRestore(
        shopId,
        dto,
        userId,
        marker,
        restoreMutationId,
      );
    }

    // Resume a crashed resolution: reuse the stored restore mutationId so a
    // repeat updateStock is a proven no-op (receipt-exclusion filter).
    if (dto.action !== marker.resolution.action) {
      throw new ConflictException(
        `Conflicting action: resolution already in progress as ${marker.resolution.action}`,
      );
    }
    if (dto.action === RecoveryResolutionAction.ACCEPT_CURRENT_STOCK) {
      return this.finalizeReceiptResolution(shopId, dto, userId, marker, 0);
    }
    return this.performReceiptRestore(
      shopId,
      dto,
      userId,
      marker,
      marker.resolution.mutationId ?? `restore-${nanoid()}`,
    );
  }

  private async performReceiptRestore(
    shopId: string,
    dto: { productId?: string; mutationId?: string; reason: string },
    userId: string,
    marker: any,
    restoreMutationId: string,
  ): Promise<Record<string, any>> {
    const restored = await this.inventoryService.updateStock(
      shopId,
      dto.productId!,
      marker.quantity,
      { mutationId: restoreMutationId, kind: 'restore' },
    );
    if (!restored) {
      const landed = await this.inventoryService.hasClaimMutation(
        shopId,
        dto.productId!,
        restoreMutationId,
      );
      if (!landed) {
        throw new BadRequestException(
          'Stock restore failed - case remains open for retry',
        );
      }
    }
    await this.writeResolutionAdjustment(
      shopId,
      dto.productId!,
      marker.quantity,
      userId,
      `Manual resolution of mutation receipt ${dto.mutationId} - restored x${marker.quantity}: ${dto.reason}`,
    );
    return this.finalizeReceiptResolution(
      shopId,
      dto,
      userId,
      marker,
      marker.quantity,
      restoreMutationId,
    );
  }

  private async finalizeReceiptResolution(
    shopId: string,
    dto: { productId?: string; mutationId?: string; reason: string },
    userId: string,
    marker: any,
    quantityRestored: number,
    restoreMutationId?: string,
  ): Promise<Record<string, any>> {
    if (quantityRestored === 0) {
      // ACCEPT_CURRENT_STOCK: durable audit record with zero inventory effect.
      await this.writeResolutionAdjustment(
        shopId,
        dto.productId!,
        0,
        userId,
        `Manual resolution of mutation receipt ${dto.mutationId} - accepted current stock: ${dto.reason}`,
      );
    }
    // Pull the decrement receipt (and its restore receipt): the case is
    // terminally resolved, and the StockAdjustment records preserve who/when/why.
    await this.inventoryService.clearClaimMutations(
      shopId,
      dto.productId!,
      [dto.mutationId!, restoreMutationId].filter(Boolean) as string[],
    );
    return {
      resolved: true,
      action: marker.resolution?.action ?? 'accept_current_stock',
      productId: dto.productId,
      mutationId: dto.mutationId,
      quantityRestored,
    };
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  /** Write the operator correction adjustment, deduped by the receipt marker. */
  private async writeResolutionAdjustment(
    shopId: string,
    productId: string,
    quantity: number,
    userId: string,
    notes: string,
  ): Promise<void> {
    await this.inventoryService.createStockAdjustment(
      shopId,
      productId,
      quantity,
      'correction',
      userId,
      notes,
    );
  }

  /** If every item is terminally resolved, finish a RELEASING claim. */
  private async finalizeReleasedClaim(
    claimId: Types.ObjectId,
    shopId: string,
  ): Promise<void> {
    const fresh = await this.claimModel
      .findOne({ _id: claimId, shopId: new Types.ObjectId(shopId) })
      .exec();
    if (
      fresh &&
      fresh.state === InventoryClaimState.RELEASING &&
      fresh.items.every(
        (i) =>
          i.state === InventoryClaimItemState.RESTORED ||
          i.state === InventoryClaimItemState.PENDING,
      )
    ) {
      await this.claimModel
        .updateOne(
          { _id: fresh._id, state: InventoryClaimState.RELEASING },
          { $set: { state: InventoryClaimState.RELEASED } },
        )
        .exec();
    }
  }

  private claimCase(
    claim: InventoryClaimDocument,
    reasonCode: RecoveryCaseReason,
  ): RecoveryCase {
    return {
      caseId: `claim:${claim._id}`,
      kind: 'claim',
      reasonCode,
      claimId: claim._id.toString(),
      orderNumber: claim.orderNumber,
      orderId: claim.orderId?.toString(),
      claimState: claim.state,
      resolutionStatus: claim.resolution?.status,
      createdAt: claim.createdAt,
    };
  }

  private itemCase(
    claim: InventoryClaimDocument,
    item: InventoryClaimItem,
    reasonCode: RecoveryCaseReason,
  ): RecoveryCase {
    return {
      caseId: `claim_item:${claim._id}:${item.productId}`,
      kind: 'claim_item',
      reasonCode,
      claimId: claim._id.toString(),
      orderNumber: claim.orderNumber,
      orderId: claim.orderId?.toString(),
      productId: item.productId,
      productName: item.name,
      quantity: item.quantity,
      mutationId: item.mutationId,
      claimState: claim.state,
      itemState: item.state,
      resolutionStatus: item.resolution?.status,
      createdAt: claim.createdAt,
    };
  }

  private receiptCase(
    product: any,
    marker: any,
    reasonCode: RecoveryCaseReason,
  ): RecoveryCase {
    return {
      caseId: `receipt:${product._id}:${marker.mutationId}`,
      kind: 'mutation_receipt',
      reasonCode,
      claimId: marker.claimId?.toString(),
      productId: product._id.toString(),
      quantity: marker.quantity,
      mutationId: marker.mutationId,
      resolutionStatus: marker.resolution?.status,
      createdAt: marker.createdAt,
    };
  }
}
