import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: false })
  parentId?: Types.ObjectId;

  @Prop({ required: false })
  image?: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ default: 0 })
  productCount: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Create indexes for multi-tenant queries
CategorySchema.index({ shopId: 1, name: 1 });
CategorySchema.index({ shopId: 1, slug: 1 });
CategorySchema.index({ shopId: 1, parentId: 1 });
CategorySchema.index({ shopId: 1, status: 1 });
CategorySchema.index({ shopId: 1, order: 1 });
