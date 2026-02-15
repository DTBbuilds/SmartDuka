import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, IsBoolean, Min, MinLength, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  // Category name - will be matched or auto-created
  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(0)
  price: number;

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

  // Enhanced fields for bulk import
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsString()
  image?: string;
}

export class BulkImportOptionsDto {
  @IsOptional()
  @IsBoolean()
  autoCreateCategories?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSuggestCategories?: boolean;

  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @IsOptional()
  @IsString()
  targetCategoryId?: string; // Import all products to this specific category
}

export class BulkImportDto {
  products: CreateProductDto[];

  @IsOptional()
  options?: BulkImportOptionsDto;
}
