import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiInsightDocument = AiInsight & Document;

export type InsightType = 'demand_forecast' | 'anomaly_detection' | 'reorder_suggestion' | 'business_summary' | 'cash_variance_analysis';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';
export type InsightStatus = 'active' | 'read' | 'dismissed' | 'actioned';

@Schema({ timestamps: true, collection: 'ai_insights' })
export class AiInsight {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, enum: ['demand_forecast', 'anomaly_detection', 'reorder_suggestion', 'business_summary', 'cash_variance_analysis'] })
  type: InsightType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ type: Object })
  details: Record<string, any>;

  @Prop({ enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  priority: InsightPriority;

  @Prop({ enum: ['active', 'read', 'dismissed', 'actioned'], default: 'active' })
  status: InsightStatus;

  @Prop({ type: Types.ObjectId })
  relatedProductId?: Types.ObjectId;

  @Prop()
  relatedProductName?: string;

  @Prop({ type: Number, min: 0, max: 100 })
  confidence?: number;

  @Prop()
  expiresAt?: Date;

  @Prop()
  readAt?: Date;

  @Prop()
  dismissedAt?: Date;

  @Prop({ type: Types.ObjectId })
  dismissedBy?: Types.ObjectId;

  @Prop()
  actionedAt?: Date;

  @Prop({ type: Types.ObjectId })
  actionedBy?: Types.ObjectId;

  @Prop()
  actionTaken?: string;
}

export const AiInsightSchema = SchemaFactory.createForClass(AiInsight);

AiInsightSchema.index({ shopId: 1, type: 1, status: 1 });
AiInsightSchema.index({ shopId: 1, createdAt: -1 });
AiInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
