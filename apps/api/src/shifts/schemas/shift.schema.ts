import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShiftDocument = HydratedDocument<Shift>;

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

  @Prop({ enum: ['open', 'closed', 'reconciled'], default: 'open' })
  status: 'open' | 'closed' | 'reconciled';

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reconciliedBy?: Types.ObjectId;

  @Prop()
  reconciliedAt?: Date;

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
