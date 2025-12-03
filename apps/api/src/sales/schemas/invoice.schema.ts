import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;

  @Prop()
  sku?: string;

  @Prop({ min: 0, max: 1 })
  taxRate?: number;

  @Prop({ min: 0 })
  taxAmount?: number;

  @Prop({ min: 0 })
  discount?: number;
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ _id: false })
export class InvoicePayment {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, enum: ['cash', 'mpesa', 'card', 'bank_transfer', 'cheque', 'other'] })
  method: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop()
  reference?: string;

  @Prop()
  notes?: string;
}

export const InvoicePaymentSchema = SchemaFactory.createForClass(InvoicePayment);

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop()
  orderNumber?: string;

  // Invoice type
  @Prop({ required: true, enum: ['sale', 'proforma', 'credit', 'debit'], default: 'sale' })
  type: 'sale' | 'proforma' | 'credit' | 'debit';

  // Business details (seller)
  @Prop({ required: true })
  businessName: string;

  @Prop()
  businessAddress?: string;

  @Prop()
  businessPhone?: string;

  @Prop()
  businessEmail?: string;

  @Prop()
  businessLogo?: string;

  @Prop()
  businessTaxPin?: string;

  @Prop()
  businessRegistration?: string;

  // Customer details (buyer)
  @Prop()
  customerName?: string;

  @Prop()
  customerAddress?: string;

  @Prop()
  customerPhone?: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  customerTaxPin?: string;

  // Invoice dates
  @Prop({ required: true })
  issueDate: Date;

  @Prop({ required: true })
  dueDate: Date;

  // Line items
  @Prop({ type: [InvoiceItemSchema], default: [] })
  items: InvoiceItem[];

  // Totals
  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ min: 0 })
  discount?: number;

  @Prop()
  discountType?: 'fixed' | 'percentage';

  @Prop({ min: 0 })
  taxableAmount?: number;

  @Prop({ required: true, min: 0 })
  taxAmount: number;

  @Prop({ min: 0, max: 1 })
  taxRate?: number;

  @Prop({ required: true, min: 0 })
  total: number;

  // Payment tracking
  @Prop({ type: [InvoicePaymentSchema], default: [] })
  payments: InvoicePayment[];

  @Prop({ required: true, min: 0, default: 0 })
  amountPaid: number;

  @Prop({ required: true, min: 0 })
  amountDue: number;

  @Prop({ required: true, enum: ['unpaid', 'partial', 'paid', 'overdue', 'cancelled'], default: 'unpaid' })
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';

  // Status
  @Prop({ required: true, enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'void'], default: 'draft' })
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'void';

  // Additional info
  @Prop()
  notes?: string;

  @Prop()
  terms?: string;

  @Prop()
  footerMessage?: string;

  // Currency
  @Prop({ default: 'KES' })
  currency: string;

  // Tracking
  @Prop()
  sentAt?: Date;

  @Prop()
  viewedAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancelReason?: string;

  // PDF storage
  @Prop()
  pdfUrl?: string;

  @Prop()
  pdfGeneratedAt?: Date;

  // Created by
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop()
  createdByName?: string;

  // Reminders
  @Prop({ default: 0 })
  remindersSent: number;

  @Prop()
  lastReminderAt?: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Indexes for efficient queries
InvoiceSchema.index({ shopId: 1, createdAt: -1 });
InvoiceSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
InvoiceSchema.index({ shopId: 1, status: 1 });
InvoiceSchema.index({ shopId: 1, paymentStatus: 1 });
InvoiceSchema.index({ shopId: 1, customerPhone: 1 });
InvoiceSchema.index({ shopId: 1, customerEmail: 1 });
InvoiceSchema.index({ shopId: 1, dueDate: 1 });
// invoiceNumber index already defined in @Prop decorator
InvoiceSchema.index({ orderId: 1 });
