import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: true, collection: 'password_reset_tokens' })
export class PasswordResetToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt?: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);

// Auto-delete expired tokens after 24 hours
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
