import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

export enum ActivityType {
  SHOP_REGISTERED = 'shop_registered',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPGRADED = 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED = 'subscription_downgraded',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_REACTIVATED = 'subscription_reactivated',
  PAYMENT_MADE = 'payment_made',
  PAYMENT_FAILED = 'payment_failed',
  INVOICE_CREATED = 'invoice_created',
  INVOICE_PAID = 'invoice_paid',
  SETUP_COMPLETED = 'setup_completed',
  EMPLOYEE_ADDED = 'employee_added',
  PRODUCT_ADDED = 'product_added',
  PLAN_CHANGED = 'plan_changed',
}

/**
 * Activity Log Schema
 * 
 * Tracks all important activities and events for audit trail and history
 */
@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, enum: ActivityType, index: true })
  activityType: ActivityType;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object, required: false, default: {} })
  details?: {
    previousValue?: any;
    newValue?: any;
    planCode?: string;
    invoiceId?: string;
    paymentMethod?: string;
    amount?: number;
    [key: string]: any;
  };

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  performedBy?: Types.ObjectId;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Indexes
ActivityLogSchema.index({ shopId: 1, createdAt: -1 });
ActivityLogSchema.index({ activityType: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });
