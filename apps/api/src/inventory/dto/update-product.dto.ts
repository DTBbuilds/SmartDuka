import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, IsArray, IsDate, Min, MinLength } from 'class-validator';
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
}
