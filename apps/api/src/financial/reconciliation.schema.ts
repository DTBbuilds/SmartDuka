import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReconciliationDocument = HydratedDocument<Reconciliation>;

@Schema({ _id: false })
export class VarianceRecord {
  @Prop({ required: true })
  type: 'cash' | 'payment' | 'inventory' | 'other';

  @Prop({ required: true })
  amount: number;

  @Prop()
  description?: string;

  @Prop()
  investigationNotes?: string;

  @Prop({ enum: ['pending', 'investigated', 'resolved'], default: 'pending' })
  status?: string;
}

export const VarianceRecordSchema = SchemaFactory.createForClass(VarianceRecord);

@Schema({ timestamps: true })
export class Reconciliation {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  reconciliationDate: Date;

  @Prop({ required: true, min: 0 })
  expectedCash: number;

  @Prop({ required: true, min: 0 })
  actualCash: number;

  @Prop({ required: true })
  variance: number;

  @Prop({ required: true })
  variancePercentage: number;

  @Prop({ enum: ['pending', 'reconciled', 'variance_pending'], default: 'pending' })
  status: 'pending' | 'reconciled' | 'variance_pending';

  @Prop({ type: [VarianceRecordSchema], default: [] })
  variances?: VarianceRecord[];

  @Prop()
  reconciliationNotes?: string;

  @Prop({ required: true })
  reconciledBy: string;

  @Prop({ required: true })
  reconciliationTime: Date;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvalTime?: Date;
}

export const ReconciliationSchema = SchemaFactory.createForClass(Reconciliation);

// Create indexes for multi-tenant queries
ReconciliationSchema.index({ shopId: 1, reconciliationDate: -1 });
ReconciliationSchema.index({ shopId: 1, status: 1 });
ReconciliationSchema.index({ shopId: 1, createdAt: -1 });
