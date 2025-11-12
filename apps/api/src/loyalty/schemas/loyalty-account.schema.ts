import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LoyaltyAccountDocument = HydratedDocument<LoyaltyAccount>;

@Schema({ _id: false })
export class PointsTransaction {
  @Prop({ required: true })
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';

  @Prop({ required: true })
  amount: number;

  @Prop()
  reason?: string;

  @Prop({ required: true })
  createdAt: Date;
}

export const PointsTransactionSchema = SchemaFactory.createForClass(PointsTransaction);

@Schema({ timestamps: true })
export class LoyaltyAccount {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'LoyaltyProgram' })
  programId: Types.ObjectId;

  @Prop({ required: true, min: 0, default: 0 })
  totalPoints: number;

  @Prop({ required: true, min: 0, default: 0 })
  availablePoints: number;

  @Prop({ required: true, min: 0, default: 0 })
  redeemedPoints: number;

  @Prop({ required: true })
  tier: string; // e.g., 'Bronze', 'Silver', 'Gold'

  @Prop({ type: [PointsTransactionSchema], default: [] })
  transactions: PointsTransaction[];

  @Prop()
  lastEarnedAt?: Date;

  @Prop()
  lastRedeemedAt?: Date;

  @Prop()
  birthdayBonusClaimedAt?: Date;

  @Prop()
  referralCode?: string;

  @Prop({ default: 0 })
  referralCount: number;

  @Prop({ enum: ['active', 'suspended'], default: 'active' })
  status: 'active' | 'suspended';
}

export const LoyaltyAccountSchema = SchemaFactory.createForClass(LoyaltyAccount);

// Create indexes for multi-tenant queries
LoyaltyAccountSchema.index({ shopId: 1, customerId: 1 });
LoyaltyAccountSchema.index({ shopId: 1, tier: 1 });
LoyaltyAccountSchema.index({ shopId: 1, createdAt: -1 });
LoyaltyAccountSchema.index({ referralCode: 1 });
