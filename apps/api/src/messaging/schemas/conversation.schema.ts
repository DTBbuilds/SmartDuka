import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export type ConversationType = 'support' | 'inquiry' | 'billing' | 'technical' | 'general';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed';

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  adminUserId?: Types.ObjectId; // Shop admin who initiated

  @Prop({ type: Types.ObjectId, index: true })
  superAdminId?: Types.ObjectId; // Super admin assigned

  @Prop({ required: true })
  subject: string;

  @Prop({ default: 'general' })
  type: ConversationType;

  @Prop({ default: 'open' })
  status: ConversationStatus;

  @Prop({ default: 'normal', enum: ['low', 'normal', 'high', 'urgent'] })
  priority: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessageId?: Types.ObjectId;

  @Prop()
  lastMessageAt?: Date;

  @Prop()
  lastMessagePreview?: string;

  @Prop({ default: 0 })
  unreadCountAdmin: number; // Unread by shop admin

  @Prop({ default: 0 })
  unreadCountSuperAdmin: number; // Unread by super admin

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId })
  resolvedBy?: Types.ObjectId;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes for efficient queries
ConversationSchema.index({ shopId: 1, status: 1 });
ConversationSchema.index({ superAdminId: 1, status: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ status: 1, priority: 1 });
