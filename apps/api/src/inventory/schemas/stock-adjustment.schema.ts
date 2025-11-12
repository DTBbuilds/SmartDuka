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
    enum: ['damage', 'loss', 'correction', 'return', 'other'],
    required: true,
  })
  reason: 'damage' | 'loss' | 'correction' | 'return' | 'other';

  @Prop()
  notes?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  adjustedBy: Types.ObjectId;
}

export const StockAdjustmentSchema = SchemaFactory.createForClass(StockAdjustment);

// Create indexes for multi-tenant queries
StockAdjustmentSchema.index({ shopId: 1, productId: 1 });
StockAdjustmentSchema.index({ shopId: 1, createdAt: -1 });
StockAdjustmentSchema.index({ shopId: 1, reason: 1 });
