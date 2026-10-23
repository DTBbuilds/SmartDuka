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

export class TaxSettingsDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  // QUALITY-CORE1: the rate is a FRACTION (0.16 = 16%), matching how checkout
  // consumes it. Percent values (16) would compute a 1600% tax.
  @IsNumber()
  @Min(0)
  @Max(1)
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

  // QUALITY-CORE1: tax-inclusive pricing — shelf prices already contain the
  // tax; checkout adds nothing and extracts the tax portion for reporting.
  @IsBoolean()
  @IsOptional()
  inclusive?: boolean;
}

export class UpdateShopSettingsDto {
  // QUALITY-CORE1: nested tax settings. The previous DTO had no `tax`
  // property at all, so the global forbidNonWhitelisted ValidationPipe
  // rejected every tax-settings save from the admin UI.
  @ValidateNested()
  @Type(() => TaxSettingsDto)
  @IsOptional()
  tax?: TaxSettingsDto;

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
