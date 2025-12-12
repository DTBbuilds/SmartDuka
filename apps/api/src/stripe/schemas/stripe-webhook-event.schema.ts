import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StripeWebhookEventDocument = HydratedDocument<StripeWebhookEvent>;

/**
 * Stripe Webhook Event Schema
 * 
 * Stores all webhook events for idempotency and audit trail.
 * Prevents duplicate processing and enables event replay if needed.
 */
@Schema({ timestamps: true })
export class StripeWebhookEvent {
  @Prop({ required: true, unique: true })
  stripeEventId: string;

  @Prop({ required: true })
  type: string; // payment_intent.succeeded, customer.subscription.updated, etc.

  @Prop({ required: true })
  apiVersion: string;

  @Prop({ type: Object, required: true })
  data: Record<string, any>;

  @Prop({ default: false })
  processed: boolean;

  @Prop({ required: false })
  processedAt?: Date;

  @Prop({ required: false })
  error?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ required: false })
  lastRetryAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StripeWebhookEventSchema = SchemaFactory.createForClass(StripeWebhookEvent);

// Indexes
StripeWebhookEventSchema.index({ stripeEventId: 1 }, { unique: true });
StripeWebhookEventSchema.index({ type: 1 });
StripeWebhookEventSchema.index({ processed: 1 });
StripeWebhookEventSchema.index({ createdAt: -1 });
// TTL index to auto-delete old processed events after 90 days
StripeWebhookEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { processed: true } }
);
