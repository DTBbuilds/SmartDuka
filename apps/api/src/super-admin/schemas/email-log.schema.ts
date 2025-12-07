import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmailLogDocument = HydratedDocument<EmailLog>;

/**
 * Email Log Schema
 * 
 * Tracks all emails sent by the system for super admin oversight.
 * Includes delivery status, template used, and recipient information.
 */
@Schema({ timestamps: true })
export class EmailLog {
  // Recipient information
  @Prop({ required: true })
  to: string;

  @Prop({ required: false })
  cc?: string;

  @Prop({ required: false })
  bcc?: string;

  // Email content
  @Prop({ required: true })
  subject: string;

  @Prop({ required: false })
  templateName?: string; // e.g., 'welcome', 'shop_verified', 'payment_receipt'

  @Prop({ type: Object, required: false })
  templateVariables?: Record<string, any>;

  @Prop({ required: false })
  htmlContent?: string; // Store first 1000 chars for reference

  @Prop({ required: false })
  textContent?: string;

  // Sender information
  @Prop({ required: true, default: 'SmartDuka <smartdukainfo@gmail.com>' })
  from: string;

  @Prop({ required: false })
  replyTo?: string;

  // Context
  @Prop({ required: false, type: Types.ObjectId, ref: 'Shop' })
  shopId?: Types.ObjectId;

  @Prop({ required: false })
  shopName?: string;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: false })
  userName?: string;

  // Email category
  @Prop({ 
    required: true, 
    enum: [
      'welcome',
      'verification',
      'password_reset',
      'subscription',
      'payment',
      'invoice',
      'notification',
      'marketing',
      'support',
      'system',
      'other'
    ],
    default: 'other'
  })
  category: string;

  // Delivery status
  @Prop({ 
    required: true, 
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced', 'spam'],
    default: 'pending'
  })
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'spam';

  @Prop({ required: false })
  sentAt?: Date;

  @Prop({ required: false })
  deliveredAt?: Date;

  @Prop({ required: false })
  failedAt?: Date;

  // Error tracking
  @Prop({ required: false })
  errorMessage?: string;

  @Prop({ required: false })
  errorCode?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ required: false })
  lastRetryAt?: Date;

  // Email provider response
  @Prop({ required: false })
  messageId?: string; // Provider's message ID

  @Prop({ required: false })
  provider?: string; // e.g., 'nodemailer', 'sendgrid', 'ses'

  @Prop({ type: Object, required: false })
  providerResponse?: Record<string, any>;

  // Tracking
  @Prop({ default: false })
  opened: boolean;

  @Prop({ required: false })
  openedAt?: Date;

  @Prop({ default: 0 })
  openCount: number;

  @Prop({ default: false })
  clicked: boolean;

  @Prop({ required: false })
  clickedAt?: Date;

  @Prop({ type: [String], default: [] })
  clickedLinks: string[];

  // Metadata
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  @Prop({ required: false })
  triggeredBy?: string; // What triggered this email (e.g., 'user_registration', 'cron_job')

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);

// Indexes for efficient querying
EmailLogSchema.index({ createdAt: -1 });
EmailLogSchema.index({ to: 1, createdAt: -1 });
EmailLogSchema.index({ shopId: 1, createdAt: -1 });
EmailLogSchema.index({ status: 1, createdAt: -1 });
EmailLogSchema.index({ category: 1, createdAt: -1 });
EmailLogSchema.index({ templateName: 1, createdAt: -1 });
EmailLogSchema.index({ messageId: 1 });
// Compound indexes
EmailLogSchema.index({ status: 1, category: 1, createdAt: -1 });
EmailLogSchema.index({ shopId: 1, status: 1, createdAt: -1 });
// TTL index - auto-delete after 90 days
// EmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
