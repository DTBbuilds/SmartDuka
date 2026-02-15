import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SupportTicketDocument = HydratedDocument<SupportTicket>;

@Schema({ timestamps: true })
export class SupportTicketMessage {
  @Prop({ type: Types.ObjectId, required: true })
  sender: Types.ObjectId;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' })
  status: string;

  @Prop({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: string;

  @Prop({ required: false, type: Types.ObjectId })
  assignedTo?: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  messages: SupportTicketMessage[];

  @Prop({ required: false })
  resolvedAt?: Date;

  @Prop({ required: false, trim: true })
  resolutionNotes?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);

// Create indexes for better query performance
SupportTicketSchema.index({ shopId: 1 });
SupportTicketSchema.index({ status: 1 });
SupportTicketSchema.index({ priority: 1 });
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ assignedTo: 1 });
