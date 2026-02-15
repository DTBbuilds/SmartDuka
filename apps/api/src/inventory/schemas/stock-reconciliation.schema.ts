import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockReconciliationDocument = HydratedDocument<StockReconciliation>;

@Schema({ timestamps: true })
export class StockReconciliation {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  systemQuantity: number;

  @Prop({ required: true, min: 0 })
  physicalCount: number;

  @Prop({ required: true })
  variance: number;

  @Prop({ required: true })
  reconciliationDate: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reconcililedBy: Types.ObjectId;

  @Prop()
  notes?: string;
}

export const StockReconciliationSchema = SchemaFactory.createForClass(StockReconciliation);

// Create indexes for multi-tenant queries
StockReconciliationSchema.index({ shopId: 1, productId: 1 });
StockReconciliationSchema.index({ shopId: 1, reconciliationDate: -1 });
StockReconciliationSchema.index({ shopId: 1, createdAt: -1 });
