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

  @Prop({ required: true, unique: true, trim: true, index: true })
  shopId: string;  // Human-readable shop ID (e.g., SHP-00001-A7K2B)

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

  @Prop({ 
    type: String, 
    required: false, 
    unique: true, 
    sparse: true, 
    trim: true, 
    default: undefined,
    set: (v: any) => {
      // Convert empty strings to undefined so sparse index works correctly
      if (v === '' || v === null) return undefined;
      return typeof v === 'string' ? v.trim().toUpperCase() : v;
    }
  })
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

// Pre-save hook to ensure kraPin is never an empty string
ShopSchema.pre('save', function(next) {
  if (this.kraPin === '' || this.kraPin === null) {
    this.kraPin = undefined;
  }
  next();
});

// Pre-update hooks to ensure kraPin is never an empty string
ShopSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update && update.kraPin === '') {
    update.kraPin = undefined;
    // Use $unset to remove the field entirely
    if (!update.$unset) update.$unset = {};
    update.$unset.kraPin = 1;
    delete update.kraPin;
  }
  next();
});

// Create indexes for better query performance
ShopSchema.index({ status: 1 });
ShopSchema.index({ createdAt: -1 });
