import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LocationDocument = HydratedDocument<Location>;

@Schema({ timestamps: true })
export class Location {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop({ type: Number, default: 0 })
  latitude?: number;

  @Prop({ type: Number, default: 0 })
  longitude?: number;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ default: false })
  isHeadquarters: boolean;

  @Prop()
  managerName?: string;

  @Prop()
  managerPhone?: string;

  @Prop()
  managerEmail?: string;

  @Prop({ type: Object, default: {} })
  settings?: Record<string, any>;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

// Create indexes for multi-tenant queries
LocationSchema.index({ shopId: 1, status: 1 });
LocationSchema.index({ shopId: 1, createdAt: -1 });
LocationSchema.index({ shopId: 1, isHeadquarters: 1 });
