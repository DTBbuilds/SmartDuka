import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;

  @Prop({ default: 0, min: 0 })
  cost?: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: true })
export class PaymentRecord {
  @Prop({ required: true })
  method: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop()
  reference?: string;

  @Prop({ enum: ['pending', 'completed', 'failed', 'reversed'], default: 'pending' })
  status?: string;

  @Prop()
  mpesaReceiptNumber?: string;

  @Prop()
  reversalReason?: string;

  @Prop()
  reversalTime?: Date;
}

export const PaymentRecordSchema = SchemaFactory.createForClass(PaymentRecord);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  // PHASE 3: Branch support
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  tax: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ enum: ['pending', 'completed', 'void'], default: 'pending' })
  status: 'pending' | 'completed' | 'void';

  @Prop({ enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' })
  paymentStatus: 'unpaid' | 'partial' | 'paid';

  @Prop({ type: [PaymentRecordSchema], default: [] })
  payments: PaymentRecord[];

  @Prop()
  notes?: string;

  @Prop()
  customerName?: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  cashierId?: string;

  @Prop()
  cashierName?: string;

  @Prop({ default: false })
  isOffline?: boolean;

  // Void/Return tracking
  @Prop({ enum: ['sale', 'void', 'return', 'refund'], default: 'sale' })
  transactionType?: 'sale' | 'void' | 'return' | 'refund';

  @Prop()
  voidReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  voidApprovedBy?: Types.ObjectId;

  @Prop()
  voidApprovedAt?: Date;

  // Discount tracking
  @Prop({ default: 0, min: 0 })
  discountAmount?: number;

  @Prop()
  discountReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  discountApprovedBy?: Types.ObjectId;

  // Refund tracking
  @Prop({ default: 0, min: 0 })
  refundAmount?: number;

  @Prop()
  refundReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  refundApprovedBy?: Types.ObjectId;

  @Prop()
  refundApprovedAt?: Date;

  // Shift reference
  @Prop({ type: Types.ObjectId, ref: 'Shift' })
  shiftId?: Types.ObjectId;

  // Soft delete support
  @Prop({ required: false })
  deletedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Create indexes for multi-tenant queries
OrderSchema.index({ shopId: 1, createdAt: -1 });
OrderSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
OrderSchema.index({ shopId: 1, userId: 1 });
OrderSchema.index({ shopId: 1, status: 1 });
OrderSchema.index({ shopId: 1, transactionType: 1 });
OrderSchema.index({ shopId: 1, shiftId: 1 });
OrderSchema.index({ shopId: 1, deletedAt: 1 }); // For soft delete queries
