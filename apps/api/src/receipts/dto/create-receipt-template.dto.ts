import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateReceiptTemplateDto {
  @IsString()
  name: string;

  @IsString()
  header: string;

  @IsOptional()
  @IsString()
  footer?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyPhone?: string;

  @IsOptional()
  @IsString()
  companyEmail?: string;

  @IsOptional()
  @IsString()
  companyWebsite?: string;

  @IsOptional()
  @IsBoolean()
  showItemDetails?: boolean;

  @IsOptional()
  @IsBoolean()
  showTaxBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  showQRCode?: boolean;

  @IsOptional()
  @IsString()
  qrCodeContent?: string;

  @IsOptional()
  @IsBoolean()
  showThankYouMessage?: boolean;

  @IsOptional()
  @IsString()
  thankYouMessage?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
