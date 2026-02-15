import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WhatsAppConfigDocument = WhatsAppConfig & Document;

@Schema({ timestamps: true, collection: 'whatsapp_configs' })
export class WhatsAppConfig {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  adminPhone: string;

  @Prop({ type: [String], default: [] })
  additionalRecipients: string[];

  @Prop({ default: false })
  isOptedIn: boolean;

  @Prop()
  optedInAt?: Date;

  @Prop()
  optedOutAt?: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  verificationCode?: string;

  @Prop()
  verificationExpiresAt?: Date;

  @Prop({
    type: {
      daily: { type: Boolean, default: true },
      weekly: { type: Boolean, default: true },
      monthly: { type: Boolean, default: true },
      dailyTime: { type: String, default: '20:00' },
      weeklyDay: { type: Number, default: 0 },
      monthlyDay: { type: Number, default: 1 },
    },
    default: {},
  })
  reportSchedule: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    dailyTime: string;
    weeklyDay: number;
    monthlyDay: number;
  };

  @Prop({
    type: {
      lowStock: { type: Boolean, default: true },
      salesAnomaly: { type: Boolean, default: true },
      cashVariance: { type: Boolean, default: true },
      highSales: { type: Boolean, default: false },
      paymentIssues: { type: Boolean, default: true },
    },
    default: {},
  })
  alertPreferences: {
    lowStock: boolean;
    salesAnomaly: boolean;
    cashVariance: boolean;
    highSales: boolean;
    paymentIssues: boolean;
  };

  @Prop({ enum: ['whatsapp', 'email', 'both'], default: 'whatsapp' })
  deliveryChannel: string;

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
    default: {},
  })
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };

  @Prop({ default: 20 })
  maxMessagesPerDay: number;

  @Prop({ default: 0 })
  messagesSentToday: number;

  @Prop()
  lastMessageSentAt?: Date;

  @Prop({ default: 0 })
  totalMessagesSent: number;

  @Prop({ default: 0 })
  totalMessagesDelivered: number;

  @Prop({ default: 0 })
  totalMessagesFailed: number;
}

export const WhatsAppConfigSchema = SchemaFactory.createForClass(WhatsAppConfig);
