import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentTransactionDocument = HydratedDocument<PaymentTransaction>;

@Schema({ timestamps: true })
export class PaymentTransaction {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  orderNumber: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  cashierId: Types.ObjectId;

  @Prop({ required: true })
  cashierName: string;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, enum: ['cash', 'card', 'mpesa', 'qr', 'other'], default: 'cash' })
  paymentMethod: 'cash' | 'card' | 'mpesa' | 'qr' | 'other';

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['completed', 'pending', 'failed'], default: 'completed' })
  status: 'completed' | 'pending' | 'failed';

  @Prop({ required: false })
  customerName?: string;

  @Prop({ required: false })
  customerPhone?: string;

  @Prop({ required: false })
  notes?: string;

  // M-Pesa specific fields
  @Prop({ required: false })
  mpesaReceiptNumber?: string;

  @Prop({ required: false })
  mpesaTransactionId?: string;

  // Card specific fields
  @Prop({ required: false })
  cardLastFour?: string;

  @Prop({ required: false })
  cardBrand?: string;

  // Cash specific fields
  @Prop({ required: false })
  amountTendered?: number;

  @Prop({ required: false })
  change?: number;

  // Payment reference
  @Prop({ required: false })
  referenceNumber?: string;

  // Error tracking
  @Prop({ required: false })
  errorCode?: string;

  @Prop({ required: false })
  errorMessage?: string;

  // Timestamps
  @Prop({ required: false })
  processedAt?: Date;

  @Prop({ required: false })
  completedAt?: Date;

  // Timestamps (added by @Schema({ timestamps: true }))
  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);

// Create indexes for efficient queries
PaymentTransactionSchema.index({ shopId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ shopId: 1, cashierId: 1 });
PaymentTransactionSchema.index({ shopId: 1, paymentMethod: 1 });
PaymentTransactionSchema.index({ shopId: 1, status: 1 });
PaymentTransactionSchema.index({ shopId: 1, branchId: 1 });
PaymentTransactionSchema.index({ orderId: 1 });
PaymentTransactionSchema.index({ createdAt: -1 });
// Compound index for branch-level analytics (multi-tenant)
PaymentTransactionSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ shopId: 1, branchId: 1, status: 1, createdAt: -1 });
