import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShopDocument = HydratedDocument<Shop>;

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

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: false, trim: true })
  city?: string;

  @Prop({ required: false, trim: true })
  businessType?: string;

  @Prop({ required: false, trim: true })
  kraPin?: string;

  @Prop({ enum: ['pending', 'verified', 'active', 'suspended', 'rejected', 'flagged'], default: 'pending' })
  status: 'pending' | 'verified' | 'active' | 'suspended' | 'rejected' | 'flagged';

  // Verification fields
  @Prop({ required: false, type: Types.ObjectId })
  verificationBy?: Types.ObjectId;

  @Prop({ required: false })
  verificationDate?: Date;

  @Prop({ required: false, trim: true })
  verificationNotes?: string;

  // Rejection fields
  @Prop({ required: false })
  rejectionDate?: Date;

  @Prop({ required: false, trim: true })
  rejectionReason?: string;

  // Suspension fields
  @Prop({ required: false })
  suspensionDate?: Date;

  @Prop({ required: false, trim: true })
  suspensionReason?: string;

  // Compliance fields
  @Prop({ default: 100 })
  complianceScore: number;

  @Prop({ default: 0 })
  chargebackRate: number;

  @Prop({ default: 0 })
  refundRate: number;

  @Prop({ default: 0 })
  violationCount: number;

  // Monitoring fields
  @Prop({ required: false })
  lastActivityDate?: Date;

  @Prop({ default: false })
  isMonitored: boolean;

  @Prop({ default: false })
  isFlagged: boolean;

  @Prop({ required: false, trim: true })
  flagReason?: string;

  // Support fields
  @Prop({ default: 0 })
  openTickets: number;

  @Prop({ required: false })
  lastSupportTicketDate?: Date;

  @Prop({ default: 0 })
  cashierCount: number;

  @Prop({ default: 0 })
  totalSales: number;

  @Prop({ default: 0 })
  totalOrders: number;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);

// Create indexes for better query performance
// Note: email and phone already have indexes from @Prop({ unique: true })
ShopSchema.index({ status: 1 });
ShopSchema.index({ createdAt: -1 });
ShopSchema.index({ verificationBy: 1 });
ShopSchema.index({ isFlagged: 1 });
ShopSchema.index({ isMonitored: 1 });
// Ensure kraPin is unique only when present (sparse index ignores null/undefined)
ShopSchema.index(
  { kraPin: 1 },
  {
    unique: true,
    sparse: true,
    name: 'unique_kraPin_when_present',
  },
);

