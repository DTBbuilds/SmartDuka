import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsOptional, Min, Max } from 'class-validator';

export class UpdateShopSettingsDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rate?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  appliedByDefault?: boolean;

  @IsArray()
  @IsOptional()
  taxExemptProducts?: string[];

  @IsObject()
  @IsOptional()
  categoryTaxRates?: Record<string, { rate: number; exempt: boolean }>;
}
