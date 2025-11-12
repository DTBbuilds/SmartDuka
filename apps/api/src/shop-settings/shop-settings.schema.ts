import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ShopSettings extends Document {
  @Prop({ required: true, index: true })
  shopId: string;

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 0.16 }, // 16% for Kenya
      name: { type: String, default: 'VAT' },
      description: { type: String, default: 'Value Added Tax (16%)' },
      appliedByDefault: { type: Boolean, default: true },
    },
    default: {
      enabled: true,
      rate: 0.16,
      name: 'VAT',
      description: 'Value Added Tax (16%)',
      appliedByDefault: true,
    },
  })
  tax: {
    enabled: boolean;
    rate: number;
    name: string;
    description: string;
    appliedByDefault: boolean;
  };

  @Prop({ type: [String], default: [] })
  taxExemptProducts: string[];

  @Prop({ type: Map, of: Object, default: {} })
  categoryTaxRates: Record<string, { rate: number; exempt: boolean }>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ShopSettingsSchema = SchemaFactory.createForClass(ShopSettings);
ShopSettingsSchema.index({ shopId: 1 });
