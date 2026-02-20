import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, IsBoolean, IsArray, IsDate, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsMongoId()
  preferredSupplierId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  // --- Unit of Measure & Weight ---
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  weightUnit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerUnit?: number;

  // --- Serial / IMEI Tracking ---
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  imeiNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  warrantyMonths?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  warrantyExpiry?: Date;

  // --- Pharmacy / Chemist Fields ---
  @IsOptional()
  @IsString()
  drugSchedule?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  activeIngredient?: string;

  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @IsOptional()
  @IsString()
  storageConditions?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  // --- Restaurant / Food Fields ---
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  preparationTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calorieCount?: number;

  @IsOptional()
  @IsArray()
  modifiers?: Array<{
    name: string;
    options: Array<{ label: string; price: number }>;
    required?: boolean;
    multiSelect?: boolean;
  }>;

  // --- Clothing / Variant Fields ---
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  season?: string;

  @IsOptional()
  @IsArray()
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
  @IsOptional()
  @IsString()
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  vehicleYear?: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsString()
  oemNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coreCharge?: number;

  // --- Hardware Fields ---
  @IsOptional()
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };

  // --- Agro-Vet Fields ---
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSpecies?: string[];

  @IsOptional()
  @IsString()
  withdrawalPeriod?: string;

  // --- Tiered Pricing ---
  @IsOptional()
  @IsArray()
  tieredPricing?: Array<{ minQuantity: number; price: number }>;

  // --- Service Fields ---
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isService?: boolean;
}
