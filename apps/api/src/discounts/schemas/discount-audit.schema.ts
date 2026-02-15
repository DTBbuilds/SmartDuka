import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DiscountAuditDocument = HydratedDocument<DiscountAudit>;

@Schema({ timestamps: true })
export class DiscountAudit {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Discount' })
  discountId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  appliedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  reason?: string;

  @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'approved' })
  status: 'pending' | 'approved' | 'rejected';
}

export const DiscountAuditSchema = SchemaFactory.createForClass(DiscountAudit);

// Create indexes for multi-tenant queries
DiscountAuditSchema.index({ shopId: 1, createdAt: -1 });
DiscountAuditSchema.index({ shopId: 1, discountId: 1 });
DiscountAuditSchema.index({ shopId: 1, appliedBy: 1 });
DiscountAuditSchema.index({ shopId: 1, status: 1 });
