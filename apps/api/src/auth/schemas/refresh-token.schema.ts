import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shop', index: true })
  shopId?: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedReason?: string;

  @Prop()
  deviceId?: string;

  @Prop()
  deviceFingerprint?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  @Prop({ default: 'web', enum: ['web', 'mobile', 'pos', 'api'] })
  clientType: string;

  @Prop({ type: Types.ObjectId, ref: 'RefreshToken' })
  replacedByToken?: Types.ObjectId;

  @Prop({ default: 0 })
  rotationCount: number;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Index for cleanup of expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for finding active tokens by user
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
