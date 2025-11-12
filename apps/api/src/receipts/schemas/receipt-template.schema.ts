import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReceiptTemplateDocument = HydratedDocument<ReceiptTemplate>;

@Schema({ timestamps: true })
export class ReceiptTemplate {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  header: string;

  @Prop()
  footer?: string;

  @Prop()
  companyName?: string;

  @Prop()
  companyPhone?: string;

  @Prop()
  companyEmail?: string;

  @Prop()
  companyWebsite?: string;

  @Prop({ default: true })
  showItemDetails: boolean;

  @Prop({ default: true })
  showTaxBreakdown: boolean;

  @Prop({ default: false })
  showQRCode: boolean;

  @Prop()
  qrCodeContent?: string;

  @Prop({ default: true })
  showThankYouMessage: boolean;

  @Prop()
  thankYouMessage?: string;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ default: false })
  isDefault: boolean;
}

export const ReceiptTemplateSchema = SchemaFactory.createForClass(ReceiptTemplate);

// Create indexes for multi-tenant queries
ReceiptTemplateSchema.index({ shopId: 1, status: 1 });
ReceiptTemplateSchema.index({ shopId: 1, isDefault: 1 });
ReceiptTemplateSchema.index({ shopId: 1, createdAt: -1 });
