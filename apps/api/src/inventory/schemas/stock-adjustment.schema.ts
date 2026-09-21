import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockAdjustmentDocument = HydratedDocument<StockAdjustment>;

@Schema({ timestamps: true })
export class StockAdjustment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true })
  quantityChange: number;

  @Prop({
    enum: [
      'damage',
      'loss',
      'correction',
      'return',
      'sale',
      'purchase',
      'transfer',
      'other',
    ],
    required: true,
  })
  reason:
    | 'damage'
    | 'loss'
    | 'correction'
    | 'return'
    | 'sale'
    | 'purchase'
    | 'transfer'
    | 'other';

  @Prop()
  notes?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  adjustedBy: Types.ObjectId;

  /**
   * P0-2: stable identity of the logical stock mutation this audit record
   * projects. Optional/sparse for historical records.
   */
  @Prop({ required: false })
  mutationId?: string;
}

export const StockAdjustmentSchema =
  SchemaFactory.createForClass(StockAdjustment);

// Create indexes for multi-tenant queries
StockAdjustmentSchema.index({ shopId: 1, productId: 1 });
StockAdjustmentSchema.index({ shopId: 1, createdAt: -1 });
StockAdjustmentSchema.index({ shopId: 1, reason: 1 });
// P0-2: one audit record per logical mutation per shop. Sparse so historical
// records without the field remain valid; MongoDB 4.2+ builds are
// non-blocking, so a failed build degrades to recovery pre-reads.
StockAdjustmentSchema.index(
  { shopId: 1, mutationId: 1 },
  { unique: true, sparse: true },
);
