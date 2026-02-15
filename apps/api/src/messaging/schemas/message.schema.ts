import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export type MessageSenderType = 'admin' | 'super_admin' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  senderType: MessageSenderType;

  @Prop()
  senderName?: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'sent' })
  status: MessageStatus;

  @Prop({ type: [Object], default: [] })
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];

  @Prop({ default: false })
  isSystemMessage: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ type: Types.ObjectId })
  readBy?: Types.ObjectId;

  @Prop({ default: false })
  edited: boolean;

  @Prop()
  editedAt?: Date;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ conversationId: 1, status: 1 });
