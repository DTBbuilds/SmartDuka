import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiAuditLogDocument = AiAuditLog & Document;

@Schema({ timestamps: true, collection: 'ai_audit_logs' })
export class AiAuditLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  service: string;

  @Prop({ type: Object })
  input?: Record<string, any>;

  @Prop({ type: Object })
  output?: Record<string, any>;

  @Prop({ type: Types.ObjectId })
  insightId?: Types.ObjectId;

  @Prop()
  duration?: number;

  @Prop({ default: false })
  isError: boolean;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Types.ObjectId })
  triggeredBy?: Types.ObjectId;

  @Prop({ enum: ['cron', 'manual', 'event'], default: 'cron' })
  triggerType: string;
}

export const AiAuditLogSchema = SchemaFactory.createForClass(AiAuditLog);

AiAuditLogSchema.index({ shopId: 1, createdAt: -1 });
AiAuditLogSchema.index({ service: 1, action: 1 });
