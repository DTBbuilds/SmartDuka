import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WhatsAppMessageDocument = WhatsAppMessage & Document;

export type MessageCategory = 'report' | 'alert' | 'notification' | 'verification' | 'test';
export type ReportType = 'daily' | 'weekly' | 'monthly';
export type AlertType = 'low_stock' | 'sales_anomaly' | 'cash_variance' | 'payment_issue' | 'high_sales';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

@Schema({ timestamps: true, collection: 'whatsapp_messages' })
export class WhatsAppMessage {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  from: string;

  @Prop({ required: true, enum: ['text', 'template', 'media'] })
  messageType: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: String, enum: ['queued', 'sent', 'delivered', 'read', 'failed'], default: 'queued' })
  status: MessageStatus;

  @Prop()
  providerMessageId?: string;

  @Prop()
  provider: string;

  @Prop({ required: true, enum: ['report', 'alert', 'notification', 'verification', 'test'] })
  category: MessageCategory;

  @Prop({ enum: ['daily', 'weekly', 'monthly'] })
  reportType?: ReportType;

  @Prop({ enum: ['low_stock', 'sales_anomaly', 'cash_variance', 'payment_issue', 'high_sales'] })
  alertType?: AlertType;

  @Prop()
  errorMessage?: string;

  @Prop()
  errorCode?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 3 })
  maxRetries: number;

  @Prop()
  nextRetryAt?: Date;

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;
}

export const WhatsAppMessageSchema = SchemaFactory.createForClass(WhatsAppMessage);

WhatsAppMessageSchema.index({ shopId: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ status: 1, nextRetryAt: 1 });
WhatsAppMessageSchema.index({ providerMessageId: 1 });
