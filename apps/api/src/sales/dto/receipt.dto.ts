import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateReceiptDto {
  @IsString()
  orderId: string;

  @IsString()
  shopName: string;

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
  footerMessage?: string;

  @IsEnum(['thermal', 'a4', 'email', 'whatsapp'])
  @IsOptional()
  format?: 'thermal' | 'a4' | 'email' | 'whatsapp';
}

export class ReceiptFiltersDto {
  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  skip?: string;
}
