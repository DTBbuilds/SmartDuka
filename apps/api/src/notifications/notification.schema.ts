import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotificationType = 
  // Account & Registration
  | 'welcome'
  | 'account_verified'
  | 'password_reset'
  | 'password_changed'
  | 'employee_invited'
  | 'employee_added'
  // Subscription & Billing
  | 'subscription_activated'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'subscription_renewed'
  | 'payment_successful'
  | 'payment_failed'
  | 'invoice_generated'
  // Inventory & Stock
  | 'low_stock'
  | 'out_of_stock'
  | 'stock_received'
  | 'reorder_reminder'
  // Sales & Orders
  | 'order_placed'
  | 'order_completed'
  | 'order_cancelled'
  | 'receipt_generated'
  | 'refund_processed'
  // Payments
  | 'payment_received'
  | 'mpesa_confirmed'
  // Reports
  | 'daily_report'
  | 'weekly_report'
  | 'monthly_report'
  // System
  | 'system'
  | 'security_alert'
  | 'backup_completed';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: [String], default: ['in_app'] })
  channels: NotificationChannel[];

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: false })
  emailSent: boolean;

  @Prop()
  emailSentAt?: Date;

  @Prop()
  emailError?: string;

  @Prop({ default: 'pending', enum: ['pending', 'sent', 'failed'] })
  status: string;

  @Prop()
  scheduledFor?: Date;

  @Prop({ type: Date, expires: 2592000 }) // Auto-delete after 30 days
  expiresAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ shopId: 1, createdAt: -1 });
NotificationSchema.index({ shopId: 1, read: 1 });
NotificationSchema.index({ status: 1, scheduledFor: 1 });
