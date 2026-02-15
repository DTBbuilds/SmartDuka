import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsOptional, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SocialMediaDto {
  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  twitter?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;
}

class ReceiptSettingsDto {
  @IsString()
  @IsOptional()
  shopName?: string;

  @IsString()
  @IsOptional()
  shopAddress?: string;

  @IsString()
  @IsOptional()
  shopPhone?: string;

  @IsString()
  @IsOptional()
  shopEmail?: string;

  @IsString()
  @IsOptional()
  shopLogo?: string;

  @IsString()
  @IsOptional()
  shopTaxPin?: string;

  @IsString()
  @IsOptional()
  shopWebsite?: string;

  @IsNumber()
  @IsOptional()
  printerWidth?: number;

  @IsBoolean()
  @IsOptional()
  showLogo?: boolean;

  @IsBoolean()
  @IsOptional()
  showTaxPin?: boolean;

  @IsBoolean()
  @IsOptional()
  showCashierName?: boolean;

  @IsBoolean()
  @IsOptional()
  showCustomerName?: boolean;

  @IsBoolean()
  @IsOptional()
  showItemSku?: boolean;

  @IsString()
  @IsOptional()
  headerMessage?: string;

  @IsString()
  @IsOptional()
  footerMessage?: string;

  @ValidateNested()
  @Type(() => SocialMediaDto)
  @IsOptional()
  socialMedia?: SocialMediaDto;
}

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

  @ValidateNested()
  @Type(() => ReceiptSettingsDto)
  @IsOptional()
  receipt?: ReceiptSettingsDto;
}
