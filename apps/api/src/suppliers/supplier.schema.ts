import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true })
  name: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  country?: string;

  @Prop()
  taxId?: string;

  @Prop()
  paymentTerms?: string;

  @Prop({ default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
