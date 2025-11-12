import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LoyaltyProgramDocument = HydratedDocument<LoyaltyProgram>;

@Schema({ _id: false })
export class LoyaltyTier {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0 })
  minPoints: number;

  @Prop({ required: true, min: 0, max: 100 })
  discountPercentage: number;

  @Prop({ required: true, min: 0 })
  bonusPointsMultiplier: number;
}

export const LoyaltyTierSchema = SchemaFactory.createForClass(LoyaltyTier);

@Schema({ timestamps: true })
export class LoyaltyProgram {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 0 })
  pointsPerKsh: number; // e.g., 1 point per 100 Ksh

  @Prop({ required: true, min: 0 })
  pointsExpiryDays: number; // e.g., 365 days

  @Prop({ type: [LoyaltyTierSchema], required: true })
  tiers: LoyaltyTier[];

  @Prop({ default: false })
  enableBirthdayBonus: boolean;

  @Prop({ default: 100 })
  birthdayBonusPoints: number;

  @Prop({ default: false })
  enableReferralBonus: boolean;

  @Prop({ default: 50 })
  referralBonusPoints: number;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';
}

export const LoyaltyProgramSchema = SchemaFactory.createForClass(LoyaltyProgram);

// Create indexes for multi-tenant queries
LoyaltyProgramSchema.index({ shopId: 1, status: 1 });
LoyaltyProgramSchema.index({ shopId: 1, createdAt: -1 });
