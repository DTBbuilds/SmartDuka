import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReturnDocument = HydratedDocument<Return>;

@Schema({ _id: false })
export class ReturnItem {
  @Prop({ required: true, type: Types.ObjectId })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true })
  reason: string;
}

export const ReturnItemSchema = SchemaFactory.createForClass(ReturnItem);

@Schema({ timestamps: true })
export class Return {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ type: [ReturnItemSchema], required: true })
  items: ReturnItem[];

  @Prop({ required: true, min: 0 })
  totalRefundAmount: number;

  @Prop({
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'completed';

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvalNotes?: string;

  @Prop({ default: 7 })
  returnWindow: number; // days

  @Prop()
  completedAt?: Date;

  @Prop({ default: false })
  inventoryAdjusted: boolean;
}

export const ReturnSchema = SchemaFactory.createForClass(Return);

// Create indexes for multi-tenant queries
ReturnSchema.index({ shopId: 1, status: 1 });
ReturnSchema.index({ shopId: 1, orderId: 1 });
ReturnSchema.index({ shopId: 1, createdAt: -1 });
ReturnSchema.index({ shopId: 1, requestedBy: 1 });
