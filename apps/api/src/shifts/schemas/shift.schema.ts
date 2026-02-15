import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShiftDocument = HydratedDocument<Shift>;

// Activity period tracking for accurate time measurement
export interface ActivityPeriod {
  startTime: Date;
  endTime?: Date;
  type: 'active' | 'inactive' | 'break';
  reason?: string;
}

@Schema({ timestamps: true })
export class Shift {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  cashierId: Types.ObjectId;

  @Prop({ required: true })
  cashierName: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: 0 })
  openingBalance: number;

  @Prop()
  closingBalance?: number;

  @Prop()
  expectedCash?: number;

  @Prop()
  actualCash?: number;

  @Prop()
  variance?: number;

  @Prop({ default: 0 })
  totalSales?: number;

  @Prop({ default: 0 })
  transactionCount?: number;

  @Prop({ enum: ['open', 'closed', 'reconciled'], default: 'open' })
  status: 'open' | 'closed' | 'reconciled';

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reconciliedBy?: Types.ObjectId;

  @Prop()
  reconciliedAt?: Date;

  // Activity tracking fields
  @Prop({ default: 0 })
  activeTimeMs: number; // Total active time in milliseconds

  @Prop({ default: 0 })
  inactiveTimeMs: number; // Total inactive time in milliseconds

  @Prop({ default: 0 })
  breakTimeMs: number; // Total break time in milliseconds

  @Prop()
  lastActivityAt?: Date; // Last recorded activity timestamp

  @Prop({ type: [{ 
    startTime: Date, 
    endTime: Date, 
    type: { type: String, enum: ['active', 'inactive', 'break'] },
    reason: String 
  }], default: [] })
  activityPeriods: ActivityPeriod[]; // Detailed activity log

  @Prop({ default: 0 })
  activityPingCount: number; // Number of activity pings received

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

// Create indexes for efficient queries
ShiftSchema.index({ shopId: 1, cashierId: 1, startTime: -1 });
ShiftSchema.index({ shopId: 1, status: 1 });
ShiftSchema.index({ cashierId: 1, startTime: -1 });
ShiftSchema.index({ createdAt: -1 });
