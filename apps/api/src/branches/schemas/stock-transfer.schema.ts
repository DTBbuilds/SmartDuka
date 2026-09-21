import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StockTransferDocument = StockTransfer & Document;

/**
 * Individual item in a stock transfer
 */
export class TransferItem {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: false })
  unitCost?: number;

  @Prop({ required: false })
  notes?: string;

  // Tracking
  @Prop({ required: false })
  receivedQuantity?: number;

  @Prop({ required: false })
  damagedQuantity?: number;

  @Prop({ required: false })
  receivedAt?: Date;

  /**
   * P0-8: durable receipt-event identities applied to this line. A receive
   * bound-claim and its stock credit share one event id — retries dedupe,
   * crashed receives resume by detecting the event already claimed.
   */
  @Prop({ required: false, type: [String] })
  receiptEventIds?: string[];

  /**
   * P0-8A: receipt events whose destination stock credit is proven
   * converged. receiptEventIds - convergedReceiptEventIds = in-flight
   * claims; cancellation is blocked while any exist.
   */
  @Prop({ required: false, type: [String] })
  convergedReceiptEventIds?: string[];
}

/**
 * Stock Transfer between branches
 * Supports: Branch-to-Branch, Warehouse-to-Branch, Branch-to-Warehouse
 */
@Schema({ timestamps: true })
export class StockTransfer {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  // Transfer reference number (auto-generated)
  @Prop({ required: true, unique: true })
  transferNumber: string;

  // Source branch/warehouse (null if from main store)
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch', index: true })
  fromBranchId?: Types.ObjectId;

  @Prop({ required: true })
  fromBranchName: string;

  // Flag indicating if transfer is from main store
  @Prop({ required: false, default: false })
  isFromMainStore?: boolean;

  // Destination branch/warehouse (null if to main store)
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch', index: true })
  toBranchId?: Types.ObjectId;

  @Prop({ required: true })
  toBranchName: string;

  // Flag indicating if transfer is to main store
  @Prop({ required: false, default: false })
  isToMainStore?: boolean;

  // Transfer type
  @Prop({
    required: true,
    enum: [
      'branch_to_branch',
      'warehouse_to_branch',
      'branch_to_warehouse',
      'main_to_branch',
      'branch_to_main',
      'emergency',
    ],
    default: 'branch_to_branch',
  })
  transferType:
    | 'branch_to_branch'
    | 'warehouse_to_branch'
    | 'branch_to_warehouse'
    | 'main_to_branch'
    | 'branch_to_main'
    | 'emergency';

  // Items being transferred
  @Prop({ type: [Object], required: true })
  items: TransferItem[];

  // Status workflow
  @Prop({
    required: true,
    enum: [
      'draft',
      'pending_approval',
      'approved',
      'in_transit',
      'partially_received',
      'received',
      'cancelled',
      'rejected',
    ],
    default: 'draft',
    index: true,
  })
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'in_transit'
    | 'partially_received'
    | 'received'
    | 'cancelled'
    | 'rejected';

  // Priority for urgent transfers
  @Prop({ enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' })
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Reason/notes
  @Prop({ required: false })
  reason?: string;

  @Prop({ required: false })
  notes?: string;

  // Approval workflow
  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  requestedBy?: Types.ObjectId;

  @Prop({ required: false })
  requestedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ required: false })
  approvedAt?: Date;

  @Prop({ required: false })
  approvalNotes?: string;

  /**
   * P0-8: durable in-flight ship claim. Ship sets this marker atomically
   * while status stays 'approved', converges every source deduction, then
   * finalizes approved→in_transit. A crash leaves approved+claim —
   * resumable — never 'in_transit' with stock still at source.
   */
  @Prop({ required: false })
  shipClaimId?: string;

  @Prop({ required: false })
  shipStartedAt?: Date;

  /**
   * P0-8: durable in-flight cancel claim — serializes receives (which
   * require no active cancel claim) and makes cancellation resumable.
   */
  @Prop({ required: false })
  cancelClaimId?: string;

  @Prop({ required: false })
  cancelStartedAt?: Date;

  /**
   * P0-8A: count of per-line receipt claims whose destination stock
   * credit is not yet proven converged. Incremented inside the atomic
   * bound-claim, decremented by the post-convergence mark. Cancellation
   * requires pendingReceipts == 0 so a claimed-but-not-credited receipt
   * can never be mistaken for delivered stock.
   */
  @Prop({ required: false })
  pendingReceipts?: number;

  // Shipping details
  @Prop({ required: false })
  shippedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  shippedBy?: Types.ObjectId;

  @Prop({ required: false })
  trackingNumber?: string;

  @Prop({ required: false })
  carrier?: string;

  @Prop({ required: false })
  expectedDeliveryDate?: Date;

  // Receipt details
  @Prop({ required: false })
  receivedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  receivedBy?: Types.ObjectId;

  @Prop({ required: false })
  receiptNotes?: string;

  // Rejection details
  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId;

  @Prop({ required: false })
  rejectedAt?: Date;

  @Prop({ required: false })
  rejectionReason?: string;

  // Cancellation details
  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;

  @Prop({ required: false })
  cancelledAt?: Date;

  @Prop({ required: false })
  cancellationReason?: string;

  // Financial tracking
  @Prop({ required: false })
  totalValue?: number;

  @Prop({ required: false })
  shippingCost?: number;

  // Metadata
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const StockTransferSchema = SchemaFactory.createForClass(StockTransfer);

// Indexes
// Note: transferNumber already has unique: true in @Prop decorator, no need for duplicate index
StockTransferSchema.index({ shopId: 1, status: 1 });
StockTransferSchema.index({ shopId: 1, fromBranchId: 1 });
StockTransferSchema.index({ shopId: 1, toBranchId: 1 });
StockTransferSchema.index({ shopId: 1, createdAt: -1 });

// Virtual for total items count
StockTransferSchema.virtual('totalItems').get(function () {
  return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
});

// Virtual for received items count
StockTransferSchema.virtual('totalReceived').get(function () {
  return (
    this.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) ||
    0
  );
});

StockTransferSchema.set('toJSON', { virtuals: true });
StockTransferSchema.set('toObject', { virtuals: true });
