import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shop', index: true })
  shopId?: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  accessTokenJti: string;

  @Prop({ type: Types.ObjectId, ref: 'RefreshToken' })
  refreshTokenId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastActivityAt: Date;

  @Prop()
  expiresAt: Date;

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

  @Prop()
  deviceName?: string;

  @Prop()
  browser?: string;

  @Prop()
  os?: string;

  @Prop()
  location?: string;

  @Prop()
  terminatedAt?: Date;

  @Prop()
  terminatedReason?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Index for cleanup
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for finding active sessions
SessionSchema.index({ userId: 1, isActive: 1 });
