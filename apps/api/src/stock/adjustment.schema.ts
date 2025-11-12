import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdjustmentDocument = Adjustment & Document;

@Schema({ timestamps: true })
export class Adjustment {
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  delta: number; // Positive for increase, negative for decrease

  @Prop({ required: true })
  reason: 'damage' | 'loss' | 'recount' | 'return' | 'correction' | 'other';

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  adjustedBy?: Types.ObjectId;

  @Prop()
  reference?: string; // Reference to related document (e.g., purchase order, damage report)

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AdjustmentSchema = SchemaFactory.createForClass(Adjustment);
