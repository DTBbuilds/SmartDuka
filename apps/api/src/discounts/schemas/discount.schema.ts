import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DiscountDocument = HydratedDocument<Discount>;

@Schema({ _id: false })
export class DiscountRule {
  @Prop()
  minPurchaseAmount?: number;

  @Prop()
  maxDiscountAmount?: number;

  @Prop({ type: [Types.ObjectId], default: [] })
  applicableProducts?: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], default: [] })
  applicableCategories?: Types.ObjectId[];

  @Prop({ required: true })
  validFrom: Date;

  @Prop({ required: true })
  validTo: Date;

  @Prop({ type: [String], default: [] })
  applicableDays?: string[]; // Mon, Tue, Wed, etc

  @Prop({ type: Object })
  applicableHours?: { start: number; end: number };

  @Prop({ type: [String], default: [] })
  customerSegments?: string[]; // vip, regular, inactive
}

export const DiscountRuleSchema = SchemaFactory.createForClass(DiscountRule);

@Schema({ timestamps: true })
export class Discount {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: ['percentage', 'fixed', 'bogo', 'tiered', 'coupon'],
  })
  type: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'coupon';

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ type: DiscountRuleSchema, required: true })
  rules: DiscountRule;

  @Prop({ default: 0 })
  usageLimit?: number;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: false })
  requiresApproval?: boolean;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ default: true })
  isDefault?: boolean;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);

// Create indexes for multi-tenant queries
DiscountSchema.index({ shopId: 1, status: 1 });
DiscountSchema.index({ shopId: 1, type: 1 });
DiscountSchema.index({ shopId: 1, 'rules.validFrom': 1, 'rules.validTo': 1 });
