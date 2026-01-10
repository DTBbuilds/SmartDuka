import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;

/**
 * Subscription Plan Schema
 * 
 * Defines the available subscription tiers for SmartDuka POS
 * Pricing is in KES (Kenyan Shillings) - friendly for Kenyan market
 * 
 * Plans:
 * - Starter: KES 1,000/month - 1 shop, 2 employees, 500 products
 * - Basic: KES 1,500/month - 2 shops, 5 employees, 1000 products
 * - Silver: KES 2,500/month - 5 shops, 15 employees, 2000 products
 * - Gold: KES 4,500/month - 10 shops, 25 employees, 4000 products
 */
@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, unique: true, trim: true })
  code: string; // 'starter', 'basic', 'silver', 'gold'

  @Prop({ required: true, trim: true })
  name: string; // Display name

  @Prop({ required: false, trim: true })
  description?: string;

  // Pricing in KES
  @Prop({ required: false, default: 0 })
  dailyPrice: number; // Daily subscription price (KES 99 for daily plan)

  @Prop({ required: true })
  monthlyPrice: number; // Monthly subscription price

  @Prop({ required: true })
  annualPrice: number; // Annual price (with discount)

  @Prop({ required: true })
  setupPrice: number; // One-time setup/start price

  // Limits
  @Prop({ required: true, default: 1 })
  maxShops: number; // Maximum number of shops/branches

  @Prop({ required: true, default: 2 })
  maxEmployees: number; // Maximum number of employees

  @Prop({ required: true, default: 500 })
  maxProducts: number; // Maximum number of products

  // Features included
  @Prop({ type: [String], default: [] })
  features: string[];

  // Setup includes (optional - KES 3,000 for training & support)
  @Prop({ type: Object, default: {} })
  setupIncludes: {
    siteSurvey?: boolean;
    stocktake?: boolean;
    setup?: boolean;
    training?: boolean;
    support?: boolean;
    freeMonths?: number; // Number of free subscription months included
    optional?: boolean; // If true, setup fee is optional
  };

  // Display order
  @Prop({ default: 0 })
  displayOrder: number;

  // Status
  @Prop({ enum: ['active', 'inactive', 'deprecated'], default: 'active' })
  status: 'active' | 'inactive' | 'deprecated';

  // Badge/label for UI
  @Prop({ required: false })
  badge?: string; // e.g., 'Popular', 'Best Value'

  // Color theme for UI
  @Prop({ required: false })
  colorTheme?: string; // e.g., 'blue', 'green', 'gold'

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);

// Indexes
// Note: code already has unique index from @Prop({ unique: true })
SubscriptionPlanSchema.index({ status: 1 });
SubscriptionPlanSchema.index({ displayOrder: 1 });
