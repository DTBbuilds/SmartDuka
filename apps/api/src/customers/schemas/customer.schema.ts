import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ _id: false })
export class CustomerPreferences {
  @Prop({ type: [Types.ObjectId], default: [] })
  favoriteProducts?: Types.ObjectId[];

  @Prop()
  preferredPaymentMethod?: string;

  @Prop()
  notes?: string;
}

export const CustomerPreferencesSchema = SchemaFactory.createForClass(CustomerPreferences);

@Schema({ _id: false })
export class ContactPreferences {
  @Prop({ default: false })
  sms?: boolean;

  @Prop({ default: false })
  email?: boolean;
}

export const ContactPreferencesSchema = SchemaFactory.createForClass(ContactPreferences);

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop()
  address?: string;

  @Prop()
  notes?: string;

  @Prop({ default: 0 })
  totalPurchases: number;

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop()
  lastPurchaseDate?: Date;

  @Prop()
  lastVisit?: Date;

  @Prop({ enum: ['vip', 'regular', 'inactive'], default: 'regular' })
  segment?: 'vip' | 'regular' | 'inactive';

  @Prop({ type: CustomerPreferencesSchema, default: {} })
  preferences?: CustomerPreferences;

  @Prop({ type: ContactPreferencesSchema, default: {} })
  contactPreferences?: ContactPreferences;

  @Prop({ default: 'active' })
  status: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Create indexes for multi-tenant queries
CustomerSchema.index({ shopId: 1, phone: 1 });
CustomerSchema.index({ shopId: 1, name: 1 });
CustomerSchema.index({ shopId: 1, segment: 1 });
CustomerSchema.index({ shopId: 1, lastPurchaseDate: -1 });
