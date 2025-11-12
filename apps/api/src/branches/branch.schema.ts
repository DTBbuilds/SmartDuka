import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  code: string; // e.g., BR-001

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  // Inventory settings
  @Prop({ enum: ['shared', 'separate'], default: 'shared' })
  inventoryType: 'shared' | 'separate';

  // Operational settings
  @Prop({ required: false })
  openingTime?: string; // HH:MM

  @Prop({ required: false })
  closingTime?: string; // HH:MM

  @Prop({ required: false })
  timezone?: string;

  // Metadata
  @Prop({ type: Object, default: {} })
  metadata?: {
    manager?: Types.ObjectId;
    managerName?: string;
    managerPhone?: string;
    notes?: string;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// Indexes
BranchSchema.index({ shopId: 1 });
BranchSchema.index({ shopId: 1, code: 1 }, { unique: true });
BranchSchema.index({ createdBy: 1 });
BranchSchema.index({ status: 1 });
