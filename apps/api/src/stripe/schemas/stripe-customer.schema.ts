import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StripeCustomerDocument = HydratedDocument<StripeCustomer>;

/**
 * Stripe Customer Schema
 * 
 * Links SmartDuka shops/users to Stripe customers for payment management.
 * Supports both shop-level and user-level customer records.
 */
@Schema({ timestamps: true })
export class StripeCustomer {
  @Prop({ required: true, unique: true })
  stripeCustomerId: string;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Shop' })
  shopId?: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  currency?: string; // Default currency for this customer (KES, USD, etc.)

  @Prop({ required: false })
  defaultPaymentMethodId?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, string>;

  @Prop({ type: Object, default: {} })
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false })
  delinquent?: boolean;

  @Prop({ required: false })
  lastPaymentAt?: Date;

  @Prop({ required: false })
  totalSpent?: number;

  @Prop({ default: 0 })
  paymentCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StripeCustomerSchema = SchemaFactory.createForClass(StripeCustomer);

// Indexes for efficient queries
StripeCustomerSchema.index({ stripeCustomerId: 1 }, { unique: true });
StripeCustomerSchema.index({ shopId: 1 });
StripeCustomerSchema.index({ userId: 1 });
StripeCustomerSchema.index({ email: 1 });
StripeCustomerSchema.index({ isActive: 1 });
