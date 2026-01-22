import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShopAuditLogDocument = HydratedDocument<ShopAuditLog>;

@Schema({ timestamps: true })
export class ShopAuditLog {
  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  performedBy: Types.ObjectId;

  @Prop({
    enum: ['verify', 'reject', 'suspend', 'reactivate', 'flag', 'unflag', 'update', 'create', 'delete', 'restore'],
    required: true,
  })
  action: string;

  @Prop({ required: false, type: Object })
  oldValue?: Record<string, any>;

  @Prop({ required: false, type: Object })
  newValue?: Record<string, any>;

  @Prop({ required: false, trim: true })
  reason?: string;

  @Prop({ required: false, trim: true })
  notes?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ShopAuditLogSchema = SchemaFactory.createForClass(ShopAuditLog);

// Create indexes for better query performance
ShopAuditLogSchema.index({ shopId: 1 });
ShopAuditLogSchema.index({ performedBy: 1 });
ShopAuditLogSchema.index({ createdAt: -1 });
ShopAuditLogSchema.index({ action: 1 });
