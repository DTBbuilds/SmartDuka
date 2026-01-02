import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiFeedbackDocument = AiFeedback & Document;

@Schema({ timestamps: true, collection: 'ai_feedback' })
export class AiFeedback {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  insightId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['helpful', 'not_helpful', 'inaccurate', 'too_late', 'already_known'] })
  rating: string;

  @Prop()
  comment?: string;

  @Prop({ type: Object })
  insightSnapshot?: Record<string, any>;
}

export const AiFeedbackSchema = SchemaFactory.createForClass(AiFeedback);

AiFeedbackSchema.index({ insightId: 1 });
