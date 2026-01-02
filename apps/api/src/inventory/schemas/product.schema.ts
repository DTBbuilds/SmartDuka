import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  sku?: string;

  @Prop({ required: false, trim: true })
  barcode?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: false })
  categoryId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: false, min: 0, default: 0 })
  cost?: number;

  @Prop({ required: false, min: 0, default: 0 })
  stock?: number;

  @Prop({ required: false, min: 0, default: 0 })
  tax?: number;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ required: false, min: 0, default: 10 })
  lowStockThreshold?: number;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false, trim: true })
  brand?: string;

  @Prop({ required: false })
  image?: string;

  @Prop({ required: false })
  updatedAt?: Date;

  @Prop({ required: false })
  expiryDate?: Date;

  @Prop({ required: false })
  batchNumber?: string;

  @Prop({ required: false })
  lotNumber?: string;

  // PHASE 3: Reorder automation fields
  @Prop({ required: false, min: 0, default: 0 })
  reorderPoint?: number; // Minimum stock level to trigger reorder

  @Prop({ required: false, min: 0, default: 0 })
  reorderQuantity?: number; // Quantity to order when stock is low

  @Prop({ required: false })
  preferredSupplierId?: Types.ObjectId; // Default supplier for this product

  @Prop({ required: false, min: 0, default: 0 })
  leadTimeDays?: number; // Expected delivery time from supplier

  @Prop({ required: false })
  lastRestockDate?: Date; // When product was last restocked

  // PHASE 4: Branch-specific inventory
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId; // null = shared across all branches

  @Prop({ type: Object, default: {} })
  branchInventory?: {
    [branchId: string]: {
      stock: number;
      reorderPoint?: number;
      reorderQuantity?: number;
      lastRestockDate?: Date;
    };
  };

  // Soft delete support
  @Prop({ required: false })
  deletedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Create indexes for multi-tenant queries
ProductSchema.index({ shopId: 1, name: 1 });
ProductSchema.index({ shopId: 1, barcode: 1 }, { unique: true, sparse: true }); // Unique barcode per shop
ProductSchema.index({ shopId: 1, sku: 1 }, { unique: true, sparse: true }); // Unique SKU per shop
ProductSchema.index({ shopId: 1, status: 1 });
ProductSchema.index({ shopId: 1, expiryDate: 1 });
ProductSchema.index({ shopId: 1, stock: 1 }); // For reorder automation
ProductSchema.index({ shopId: 1, branchId: 1 }); // For branch-specific queries

// Compound indexes for search optimization
ProductSchema.index({ shopId: 1, barcode: 1, status: 1 }); // Fast barcode lookup
ProductSchema.index({ shopId: 1, sku: 1, status: 1 }); // Fast SKU lookup
ProductSchema.index({ shopId: 1, brand: 1 }); // Brand filtering
ProductSchema.index({ shopId: 1, name: 'text', description: 'text', brand: 'text' }); // Full-text search
ProductSchema.index({ shopId: 1, deletedAt: 1 }); // For soft delete queries
