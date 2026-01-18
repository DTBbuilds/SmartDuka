import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReceiptDocument = HydratedDocument<Receipt>;

@Schema({ _id: false })
export class ReceiptItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;

  @Prop()
  sku?: string;

  @Prop()
  barcode?: string;
}

export const ReceiptItemSchema = SchemaFactory.createForClass(ReceiptItem);

@Schema({ _id: false })
export class ReceiptPayment {
  @Prop({ required: true, enum: ['cash', 'mpesa', 'card', 'qr', 'other'] })
  method: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop()
  reference?: string;

  @Prop()
  mpesaReceiptNumber?: string;

  @Prop()
  cardLastFour?: string;

  @Prop()
  amountTendered?: number;

  @Prop()
  change?: number;
}

export const ReceiptPaymentSchema = SchemaFactory.createForClass(ReceiptPayment);

@Schema({ timestamps: true })
export class Receipt {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  receiptNumber: string;

  @Prop({ required: true })
  orderNumber: string;

  // Shop details for receipt header
  @Prop({ required: true })
  shopName: string;

  @Prop()
  shopAddress?: string;

  @Prop()
  shopPhone?: string;

  @Prop()
  shopEmail?: string;

  @Prop()
  shopLogo?: string;

  @Prop()
  shopTaxPin?: string;

  // Branch-specific customization
  @Prop()
  branchName?: string;

  @Prop()
  headerMessage?: string;

  // Transaction details
  @Prop({ type: [ReceiptItemSchema], default: [] })
  items: ReceiptItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  tax: number;

  @Prop({ min: 0, max: 1 })
  taxRate?: number;

  @Prop({ min: 0 })
  discount?: number;

  @Prop({ required: true, min: 0 })
  total: number;

  // Payment details
  @Prop({ type: [ReceiptPaymentSchema], default: [] })
  payments: ReceiptPayment[];

  @Prop({ required: true, enum: ['cash', 'mpesa', 'card', 'qr', 'mixed', 'other'] })
  primaryPaymentMethod: string;

  // Customer details
  @Prop()
  customerName?: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  customerEmail?: string;

  // Cashier details
  @Prop({ type: Types.ObjectId, ref: 'User' })
  cashierId?: Types.ObjectId;

  @Prop()
  cashierName?: string;

  // Additional info
  @Prop()
  notes?: string;

  @Prop()
  footerMessage?: string;

  // Receipt format tracking
  @Prop({ enum: ['thermal', 'a4', 'email', 'whatsapp'], default: 'thermal' })
  format?: string;

  // Status
  @Prop({ enum: ['active', 'voided', 'reprinted'], default: 'active' })
  status: string;

  @Prop()
  voidReason?: string;

  @Prop()
  voidedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  voidedBy?: Types.ObjectId;

  // Reprint tracking
  @Prop({ default: 0 })
  reprintCount: number;

  @Prop()
  lastReprintAt?: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const ReceiptSchema = SchemaFactory.createForClass(Receipt);

// Indexes for efficient queries
ReceiptSchema.index({ shopId: 1, createdAt: -1 });
ReceiptSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
ReceiptSchema.index({ shopId: 1, orderId: 1 });
ReceiptSchema.index({ shopId: 1, customerPhone: 1 });
ReceiptSchema.index({ shopId: 1, primaryPaymentMethod: 1 });
// receiptNumber index already defined in @Prop decorator
ReceiptSchema.index({ orderNumber: 1 });
