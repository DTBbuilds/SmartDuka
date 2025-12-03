import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class UpdateMpesaConfigDto {
  @IsOptional()
  @IsEnum(['paybill', 'till'])
  type?: 'paybill' | 'till';

  @IsOptional()
  @IsString()
  shortCode?: string;

  @IsOptional()
  @IsString()
  consumerKey?: string;

  @IsOptional()
  @IsString()
  consumerSecret?: string;

  @IsOptional()
  @IsString()
  passkey?: string;

  @IsOptional()
  @IsString()
  accountPrefix?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class InitiateMultiTenantStkDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  orderId: string;

  @IsString()
  orderNumber: string;

  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
