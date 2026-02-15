import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdjustmentDocument = Adjustment & Document;

/**
 * Stock Adjustment Schema
 * 
 * Records all stock adjustments with full audit trail for:
 * - Inventory reconciliation
 * - Loss prevention analysis
 * - Compliance and auditing
 * - Stock movement tracking
 */
@Schema({ timestamps: true })
export class Adjustment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  delta: number; // Positive for increase, negative for decrease

  @Prop({ required: true, enum: [
    'damage', 'loss', 'recount', 'return', 'correction', 
    'received', 'transfer_in', 'transfer_out', 'expired', 'theft', 'other'
  ]})
  reason: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  adjustedBy?: Types.ObjectId;

  @Prop()
  adjustedByName?: string; // Denormalized for quick display

  @Prop()
  reference?: string; // Reference to related document (e.g., purchase order, damage report)

  // Audit trail fields
  @Prop({ type: Number })
  previousStock?: number; // Stock before adjustment

  @Prop({ type: Number })
  newStock?: number; // Stock after adjustment

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId; // For branch-specific adjustments

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AdjustmentSchema = SchemaFactory.createForClass(Adjustment);

// Indexes for common queries
AdjustmentSchema.index({ shopId: 1, createdAt: -1 });
AdjustmentSchema.index({ shopId: 1, productId: 1 });
AdjustmentSchema.index({ shopId: 1, reason: 1 });
