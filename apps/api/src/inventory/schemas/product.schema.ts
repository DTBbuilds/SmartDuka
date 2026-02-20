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

  // --- Unit of Measure & Weight ---
  @Prop({ required: false, default: 'piece' })
  unitOfMeasure?: string;

  @Prop({ required: false, min: 0 })
  weight?: number;

  @Prop({ required: false })
  weightUnit?: string;

  @Prop({ required: false, min: 0 })
  pricePerUnit?: number;

  // --- Serial / IMEI Tracking ---
  @Prop({ required: false })
  serialNumber?: string;

  @Prop({ required: false })
  imeiNumber?: string;

  @Prop({ required: false, min: 0, default: 0 })
  warrantyMonths?: number;

  @Prop({ required: false })
  warrantyExpiry?: Date;

  // --- Pharmacy / Chemist Fields ---
  @Prop({ required: false, enum: ['OTC', 'POM', 'P', 'controlled_II', 'controlled_III', 'controlled_IV', 'controlled_V', 'unscheduled'] })
  drugSchedule?: string;

  @Prop({ required: false })
  dosageForm?: string;

  @Prop({ required: false })
  strength?: string;

  @Prop({ required: false })
  activeIngredient?: string;

  @Prop({ required: false, default: false })
  requiresPrescription?: boolean;

  @Prop({ required: false })
  storageConditions?: string;

  @Prop({ required: false })
  manufacturer?: string;

  // --- Restaurant / Food Fields ---
  @Prop({ type: [String], default: [] })
  ingredients?: string[];

  @Prop({ type: [String], default: [] })
  allergens?: string[];

  @Prop({ required: false, min: 0 })
  preparationTime?: number;

  @Prop({ required: false, min: 0 })
  calorieCount?: number;

  @Prop({ type: [Object], default: [] })
  modifiers?: Array<{
    name: string;
    options: Array<{
      label: string;
      price: number;
    }>;
    required?: boolean;
    multiSelect?: boolean;
  }>;

  // --- Clothing / Variant Fields ---
  @Prop({ required: false })
  size?: string;

  @Prop({ required: false })
  color?: string;

  @Prop({ required: false })
  material?: string;

  @Prop({ required: false })
  season?: string;

  @Prop({ type: [Object], default: [] })
  variants?: Array<{
    sku?: string;
    barcode?: string;
    size?: string;
    color?: string;
    price: number;
    cost?: number;
    stock: number;
  }>;

  // --- Auto Parts Fields ---
  @Prop({ required: false })
  vehicleMake?: string;

  @Prop({ required: false })
  vehicleModel?: string;

  @Prop({ required: false })
  vehicleYear?: string;

  @Prop({ required: false })
  partNumber?: string;

  @Prop({ required: false })
  oemNumber?: string;

  @Prop({ required: false, min: 0 })
  coreCharge?: number;

  // --- Hardware Fields ---
  @Prop({ type: Object, default: {} })
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };

  // --- Agro-Vet Fields ---
  @Prop({ type: [String], default: [] })
  targetSpecies?: string[];

  @Prop({ required: false })
  withdrawalPeriod?: string;

  // --- Tiered / Volume Pricing ---
  @Prop({ type: [Object], default: [] })
  tieredPricing?: Array<{
    minQuantity: number;
    price: number;
  }>;

  // --- Tags ---
  @Prop({ type: [String], default: [] })
  tags?: string[];

  // --- Service-based fields ---
  @Prop({ required: false, min: 0 })
  duration?: number;

  @Prop({ required: false, default: false })
  isService?: boolean;

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
