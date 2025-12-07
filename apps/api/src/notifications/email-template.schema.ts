import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmailTemplateDocument = EmailTemplate & Document;

@Schema({ timestamps: true })
export class EmailTemplate {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  htmlContent: string;

  @Prop()
  textContent?: string;

  @Prop({ type: [String], default: [] })
  variables: string[]; // e.g., ['shopName', 'userName', 'orderTotal']

  @Prop({ default: true })
  active: boolean;

  @Prop()
  description?: string;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);
