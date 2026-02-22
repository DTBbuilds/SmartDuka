import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, enum: ['registration', 'password_reset', 'email_verification', 'login'] })
  type: 'registration' | 'password_reset' | 'email_verification' | 'login';

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 5 })
  maxAttempts: number;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Index for cleanup of expired OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Index for quick lookup
OtpSchema.index({ email: 1, type: 1, used: 1 });
