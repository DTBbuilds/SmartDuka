import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShopDocument = Shop & Document;

@Schema({ timestamps: true })
export class Shop {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  @Prop()
  tillNumber?: string;

  @Prop({ type: Types.ObjectId, required: false })
  ownerId?: Types.ObjectId;

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: false, trim: true })
  city?: string;

  @Prop({ required: false, trim: true })
  country?: string;

  @Prop({ required: false, trim: true })
  businessType?: string;

  @Prop({ type: String, required: false, unique: true, sparse: true, trim: true, default: null })
  kraPin?: string;

  @Prop({ default: 'en' })
  language: 'en' | 'sw';

  @Prop({ enum: ['pending', 'verified', 'active', 'suspended'], default: 'pending' })
  status: 'pending' | 'verified' | 'active' | 'suspended';

  @Prop({ required: false })
  verificationDate?: Date;

  @Prop({ required: false, trim: true })
  verificationNotes?: string;

  @Prop({ default: 0 })
  cashierCount: number;

  @Prop({ default: 0 })
  totalSales: number;

  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  @Prop({ default: false })
  onboardingComplete: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);

// Create indexes for better query performance
ShopSchema.index({ status: 1 });
ShopSchema.index({ createdAt: -1 });
