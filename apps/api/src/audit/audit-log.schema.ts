import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  action: string; // 'create_branch', 'assign_staff', 'change_permission', etc.

  @Prop({ required: true })
  resource: string; // 'branch', 'user', 'permission', 'inventory', etc.

  @Prop({ required: false, type: Types.ObjectId })
  resourceId?: Types.ObjectId;

  @Prop({ required: false, type: Object })
  changes?: {
    before: any;
    after: any;
  };

  @Prop({ required: false })
  reason?: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes
AuditLogSchema.index({ shopId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ branchId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ resource: 1 });
