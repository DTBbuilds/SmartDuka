import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InventoryClaimDocument = HydratedDocument<InventoryClaim>;

/**
 * Durable inventory claim record - the authoritative crash-recovery evidence
 * for one logical checkout's stock reservation.
 *
 * Lifecycle (SDV2-005):
 *   CLAIMING   -> claim document created, items being claimed
 *   CLAIMED    -> all items claimed, order not yet persisted
 *   COMMITTED  -> order persisted; legitimate reservation
 *   RELEASING  -> release (compensation / void / refund) in progress
 *   RELEASED   -> fully released; terminal
 *
 * A claim left in CLAIMING/CLAIMED without a committed order, or in
 * RELEASING with un-restored items, is recoverable by the reconciliation
 * worker. Per-item state makes compensation resumable after a crash.
 */
export enum InventoryClaimState {
  CLAIMING = 'claiming',
  CLAIMED = 'claimed',
  COMMITTED = 'committed',
  RELEASING = 'releasing',
  RELEASED = 'released',
  /**
   * Manually resolved by an authorized operator (SDV2-006). Terminal:
   * reconciliation never re-opens it. Used when the operator concludes the
   * persisted evidence does not warrant automatic release.
   */
  RESOLVED = 'resolved',
}

export enum InventoryClaimItemState {
  PENDING = 'pending', // intent recorded, stock mutation not yet applied
  CLAIMED = 'claimed', // stock claimed (atomic decrement applied)
  RESTORING = 'restoring', // restoration intent recorded (ambiguous window)
  RESTORED = 'restored', // stock restored + audit adjustment written
}

/**
 * Operator decision record for an ambiguous claim or claim item (SDV2-006).
 * 'resolving' is persisted BEFORE any stock mutation so a crash mid-resolution
 * leaves durable, inspectable evidence instead of a half-applied correction.
 */
export enum RecoveryResolutionStatus {
  RESOLVING = 'resolving',
  RESOLVED = 'resolved',
}

export enum RecoveryResolutionAction {
  RESTORE_STOCK = 'restore_stock',
  ACCEPT_CURRENT_STOCK = 'accept_current_stock',
}

@Schema({ _id: false })
export class RecoveryResolution {
  @Prop({
    required: true,
    enum: Object.values(RecoveryResolutionStatus),
  })
  status: RecoveryResolutionStatus;

  @Prop({
    required: true,
    enum: Object.values(RecoveryResolutionAction),
  })
  action: RecoveryResolutionAction;

  /**
   * For restore_stock: the durable restore receipt id pushed atomically with
   * the +quantity product update, so a crash mid-resolution is provable.
   */
  @Prop({ required: false })
  mutationId?: string;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @Prop({ required: false })
  resolvedAt?: Date;

  @Prop({ required: false })
  reason?: string;
}

export const RecoveryResolutionSchema =
  SchemaFactory.createForClass(RecoveryResolution);

/** Free-form investigation note (escalation path leaves the case open). */
@Schema({ _id: false })
export class RecoveryNote {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  notedBy: Types.ObjectId;

  @Prop({ required: true })
  notedAt: Date;
}

export const RecoveryNoteSchema = SchemaFactory.createForClass(RecoveryNote);

@Schema({ _id: false })
export class InventoryClaimItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  /**
   * Unique durable mutation identity for this item's stock decrement. The
   * decrement and its receipt are written atomically on the product
   * document (claimMutations), so recovery can prove whether the decrement
   * landed even if the crash hit before the CLAIMED flag.
   */
  @Prop({ required: false })
  mutationId?: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({
    required: true,
    enum: Object.values(InventoryClaimItemState),
    default: InventoryClaimItemState.PENDING,
  })
  state: InventoryClaimItemState;

  /** Operator resolution for ambiguous item states (SDV2-006). */
  @Prop({ required: false, type: RecoveryResolutionSchema })
  resolution?: RecoveryResolution;
}

export const InventoryClaimItemSchema = SchemaFactory.createForClass(InventoryClaimItem);

@Schema({ timestamps: true, collection: 'inventory_claims' })
export class InventoryClaim {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  /** Stable logical-checkout identity (SDV2-003); optional for legacy clients. */
  @Prop({ required: false })
  idempotencyKey?: string;

  /** Unique per-checkout order reference; generated before any claim. */
  @Prop({ required: true })
  orderNumber: string;

  /** Set once the order document is persisted (state -> committed). */
  @Prop({ required: false, type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(InventoryClaimState),
    default: InventoryClaimState.CLAIMING,
  })
  state: InventoryClaimState;

  @Prop({ type: [InventoryClaimItemSchema], default: [] })
  items: InventoryClaimItem[];

  /** Who to attribute recovery/compensation audit records to. */
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  claimedBy: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  /** Operator resolution for claim-level ambiguity (SDV2-006). */
  @Prop({ required: false, type: RecoveryResolutionSchema })
  resolution?: RecoveryResolution;

  /** Investigation notes; escalation records here without closing the case. */
  @Prop({ type: [RecoveryNoteSchema], default: [] })
  notes?: RecoveryNote[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const InventoryClaimSchema = SchemaFactory.createForClass(InventoryClaim);

// One logical checkout per shop per order number
InventoryClaimSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });
// Recovery discovery: incomplete claims, oldest first
InventoryClaimSchema.index({ state: 1, createdAt: 1 });
// Tenant-scoped recovery-case listing (SDV2-006)
InventoryClaimSchema.index({ shopId: 1, state: 1, createdAt: 1 });
// Tenant-scoped lookup by idempotency key (sparse: legacy checkouts may omit it)
InventoryClaimSchema.index({ shopId: 1, idempotencyKey: 1 }, { sparse: true });
