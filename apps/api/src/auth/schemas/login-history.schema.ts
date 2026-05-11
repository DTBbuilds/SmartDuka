import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoginHistoryDocument = LoginHistory & Document;

@Schema({ timestamps: true })
export class LoginHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  role: string;

  @Prop({ type: Types.ObjectId, ref: 'Shop', index: true })
  shopId?: Types.ObjectId;

  @Prop()
  shopName?: string;

  @Prop({ required: true, enum: ['password', 'google', 'pin', 'super_admin'] })
  loginMethod: string;

  @Prop({ required: true, enum: ['success', 'failed', 'otp_required', 'otp_verified'] })
  status: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  deviceInfo?: string;

  @Prop()
  location?: string;

  @Prop()
  failureReason?: string;

  @Prop({ type: Date })
  createdAt: Date;
}

export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory);

// Create indexes for efficient querying
LoginHistorySchema.index({ createdAt: -1 });
LoginHistorySchema.index({ userId: 1, createdAt: -1 });
LoginHistorySchema.index({ email: 1, createdAt: -1 });
