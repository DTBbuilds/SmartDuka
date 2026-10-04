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

  // --- Business-type-specific item fields ---
  @Prop()
  unitOfMeasure?: string;

  @Prop({ min: 0 })
  weight?: number;

  @Prop()
  serialNumber?: string;

  @Prop()
  imeiNumber?: string;

  @Prop()
  batchNumber?: string;

  @Prop()
  expiryDate?: Date;

  // Restaurant modifiers applied to this item
  @Prop({ type: [Object], default: [] })
  modifiers?: Array<{
    name: string;
    option: string;
    price: number;
  }>;

  @Prop()
  specialInstructions?: string;

  // Kitchen status tracking
  @Prop({
    enum: ['pending', 'preparing', 'ready', 'served'],
    default: 'pending',
  })
  kitchenStatus?: string;

  // Prescription reference (pharmacy)
  @Prop()
  prescriptionRef?: string;
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

  @Prop({
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending',
  })
  status?: string;

  @Prop()
  mpesaReceiptNumber?: string;

  /**
   * P0-10C: timestamp of the last durable provider-initiation claim on this
   * record. Set atomically before any provider call so a crash leaves visible,
   * unresolved provenance (status stays 'pending' → void remains blocked).
   */
  @Prop()
  initiatedAt?: Date;

  /**
   * P0-10D: provider identity for Stripe card payments — links the order's
   * payment allocation to the Stripe PaymentIntent so verified webhooks /
   * server-side retrieval can converge this order (and a lost browser
   * response never loses the money→order binding).
   */
  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  reversalReason?: string;

  @Prop()
  reversalTime?: Date;
}

export const PaymentRecordSchema = SchemaFactory.createForClass(PaymentRecord);

@Schema({ _id: false })
export class RefundAllocation {
  @Prop({ required: true })
  method: string;

  @Prop({ required: true, min: 0 })
  amount: number;
}
export const RefundAllocationSchema =
  SchemaFactory.createForClass(RefundAllocation);

/**
 * P0-10: durable append-only refund event. A refund is a NEW financial event
 * against an immutable settled sale — never an overwrite of sale fields.
 * `status` is payment truth: 'completed' only when SmartDuka can honestly
 * claim money moved (cash); provider methods are 'manual_required' until a
 * real reversal confirmation exists.
 */
@Schema({ _id: false })
export class RefundEvent {
  @Prop({ required: true })
  refundOperationId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ type: [RefundAllocationSchema], default: [] })
  allocations: RefundAllocation[];

  @Prop({ enum: ['completed', 'manual_required'], required: true })
  status: string;
}
export const RefundEventSchema = SchemaFactory.createForClass(RefundEvent);

/**
 * P0-10: durable void claim + stock-compensation progress. Claimed before any
 * compensation; retry of the same voidOperationId resumes safely, a different
 * id conflicts.
 */
@Schema({ _id: false })
export class VoidOperation {
  @Prop({ required: true })
  voidOperationId: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ enum: ['in_progress', 'completed'], required: true })
  status: string;

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true },
        mutationId: { type: String, required: true },
      },
    ],
    default: [],
  })
  stockRestorations: Array<{
    productId: string;
    quantity: number;
    mutationId: string;
  }>;

  @Prop()
  completedAt?: Date;
}
export const VoidOperationSchema = SchemaFactory.createForClass(VoidOperation);

@Schema({ _id: false })
export class DiscountEvent {
  @Prop({ required: true })
  discountOperationId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ required: true })
  createdAt: Date;
}
export const DiscountEventSchema = SchemaFactory.createForClass(DiscountEvent);

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

  /**
   * Stable client-generated key for one logical checkout. Optional for
   * historical records (sparse index excludes them).
   */
  @Prop({ required: false })
  idempotencyKey?: string;

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

  // Customer reference - links to Customer document for loyalty tracking
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId;

  @Prop()
  customerName?: string;

  @Prop()
  customerPhone?: string;

  // Loyalty points tracking
  @Prop({ default: 0, min: 0 })
  loyaltyPointsEarned?: number;

  @Prop({ default: 0, min: 0 })
  loyaltyPointsRedeemed?: number;

  @Prop({ default: 0, min: 0 })
  loyaltyDiscount?: number;

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

  // P0-10: append-only financial events. The settled sale facts (items,
  // subtotal, tax, total, payments, transactionType) are immutable — refunds,
  // voids, and pre-settlement discounts are recorded here, never by rewriting
  // the sale.
  @Prop({ type: [RefundEventSchema], default: [] })
  refunds?: RefundEvent[];

  @Prop({
    enum: ['not_refunded', 'partially_refunded', 'refunded'],
    default: 'not_refunded',
  })
  refundStatus?: string;

  @Prop({ type: VoidOperationSchema })
  voidOperation?: VoidOperation;

  @Prop({ type: [DiscountEventSchema], default: [] })
  discounts?: DiscountEvent[];

  // Shift reference
  @Prop({ type: Types.ObjectId, ref: 'Shift' })
  shiftId?: Types.ObjectId;

  // --- Business-type-specific order fields ---

  // Restaurant: order type
  @Prop({
    enum: ['standard', 'dine_in', 'takeaway', 'delivery'],
    default: 'standard',
  })
  orderType?: string;

  // Restaurant: table number
  @Prop()
  tableNumber?: string;

  // Restaurant: number of guests
  @Prop({ min: 0 })
  guestCount?: number;

  // Restaurant: tips
  @Prop({ default: 0, min: 0 })
  tipAmount?: number;

  // Restaurant: kitchen status
  @Prop({
    enum: [
      'new',
      'sent_to_kitchen',
      'preparing',
      'ready',
      'served',
      'completed',
    ],
    default: 'new',
  })
  kitchenStatus?: string;

  // Delivery info
  @Prop()
  deliveryAddress?: string;

  @Prop()
  deliveryPhone?: string;

  // Service-based: appointment reference
  @Prop()
  appointmentId?: string;

  // Service-based: service provider/staff
  @Prop()
  serviceProviderId?: string;

  @Prop()
  serviceProviderName?: string;

  // Soft delete support
  @Prop({ required: false })
  deletedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Create indexes for multi-tenant queries
OrderSchema.index({ shopId: 1, createdAt: -1 });
// Tenant-scoped checkout idempotency: one logical checkout per shop per key.
// Partial so historical orders without the key remain outside the index —
// a compound sparse index cannot express that (shopId is always present,
// so missing keys would index as null and collide).
OrderSchema.index(
  { shopId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $exists: true } },
  },
);
OrderSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
OrderSchema.index({ shopId: 1, userId: 1 });
OrderSchema.index({ shopId: 1, status: 1 });
OrderSchema.index({ shopId: 1, transactionType: 1 });
OrderSchema.index({ shopId: 1, shiftId: 1 });
OrderSchema.index({ shopId: 1, deletedAt: 1 }); // For soft delete queries
OrderSchema.index({ shopId: 1, customerId: 1 }); // For customer sales history
