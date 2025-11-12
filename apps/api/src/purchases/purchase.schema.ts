import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface PurchaseItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export type PurchaseDocument = Purchase & Document;

@Schema({ timestamps: true })
export class Purchase {
  @Prop({ required: true, unique: true })
  purchaseNumber: string;

  @Prop({ type: Types.ObjectId, required: true })
  supplierId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  // PHASE 5: Branch support
  @Prop({ type: Types.ObjectId, required: false })
  branchId?: Types.ObjectId;

  @Prop({ type: [Object], required: true })
  items: PurchaseItem[];

  @Prop({ required: true })
  totalCost: number;

  @Prop({ default: 'pending' })
  status: 'pending' | 'received' | 'cancelled';

  @Prop()
  expectedDeliveryDate?: Date;

  @Prop()
  receivedDate?: Date;

  @Prop()
  invoiceNumber?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);

// Create indexes for multi-tenant queries
PurchaseSchema.index({ shopId: 1, createdAt: -1 });
PurchaseSchema.index({ shopId: 1, branchId: 1, createdAt: -1 });
PurchaseSchema.index({ shopId: 1, status: 1 });
