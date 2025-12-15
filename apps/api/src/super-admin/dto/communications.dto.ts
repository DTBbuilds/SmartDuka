import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsEnum, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SendManualEmailDto {
  @IsEnum(['shop', 'all_shops', 'custom'])
  recipientType: 'shop' | 'all_shops' | 'custom';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shopIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customEmails?: string[];

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class LineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateManualInvoiceDto {
  @IsString()
  shopId: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsEnum(['subscription', 'addon', 'setup'])
  type: 'subscription' | 'addon' | 'setup';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
