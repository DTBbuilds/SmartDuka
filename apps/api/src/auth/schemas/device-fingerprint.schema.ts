import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceFingerprintDocument = DeviceFingerprint & Document;

@Schema({ timestamps: true })
export class DeviceFingerprint {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  fingerprint: string;

  @Prop({ required: true })
  deviceName: string;

  @Prop()
  deviceType?: 'desktop' | 'mobile' | 'tablet';

  @Prop()
  browser?: string;

  @Prop()
  os?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ default: false })
  isTrusted: boolean;

  @Prop({ default: 0 })
  loginCount: number;

  @Prop({ default: 0 })
  otpRequiredCount: number;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  trustedAt?: Date;

  @Prop({ default: true })
  isActive: true;

  @Prop()
  expiresAt?: Date; // For temporary trusted devices
}

export const DeviceFingerprintSchema = SchemaFactory.createForClass(DeviceFingerprint);

// Indexes for performance
DeviceFingerprintSchema.index({ userId: 1, fingerprint: 1 }, { unique: true });
DeviceFingerprintSchema.index({ userId: 1, isTrusted: 1 });
DeviceFingerprintSchema.index({ fingerprint: 1 });
DeviceFingerprintSchema.index({ lastLoginAt: 1 });
