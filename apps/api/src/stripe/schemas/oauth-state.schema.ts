import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * FIX1-A4 — SINGLE-USE OAUTH STATE NONCES (durable, multi-instance safe).
 *
 * Each Connect OAuth flow stores its state nonce here; the callback
 * consumes it atomically (findOneAndDelete) — a replayed state (same nonce)
 * finds nothing and is rejected. The TTL index expires entries after
 * 20 minutes (the state token itself expires at 15) so the collection
 * self-cleans.
 */
@Schema({ timestamps: true, collection: 'oauth_states' })
export class OAuthState {
  @Prop({ required: true, unique: true, index: true })
  nonce: string;

  @Prop({ required: true })
  shopId: string;

  @Prop({ required: true })
  userId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OAuthStateSchema = SchemaFactory.createForClass(OAuthState);
// TTL: 20 minutes after creation.
OAuthStateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1200 });
