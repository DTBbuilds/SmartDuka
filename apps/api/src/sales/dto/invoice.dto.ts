import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsDate, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsEnum(['sale', 'proforma', 'credit', 'debit'])
  @IsOptional()
  type?: 'sale' | 'proforma' | 'credit' | 'debit';

  @IsString()
  businessName: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  @IsString()
  @IsOptional()
  businessPhone?: string;

  @IsString()
  @IsOptional()
  businessEmail?: string;

  @IsString()
  @IsOptional()
  businessLogo?: string;

  @IsString()
  @IsOptional()
  businessTaxPin?: string;

  @IsString()
  @IsOptional()
  businessRegistration?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerTaxPin?: string;

  @IsOptional()
  @Type(() => Date)
  issueDate?: Date;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  @IsOptional()
  items?: InvoiceItemDto[];

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsEnum(['fixed', 'percentage'])
  @IsOptional()
  discountType?: 'fixed' | 'percentage';

  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  terms?: string;

  @IsString()
  @IsOptional()
  footerMessage?: string;
}

export class RecordPaymentDto {
  @IsEnum(['cash', 'mpesa', 'card', 'bank_transfer', 'cheque', 'other'])
  method: 'cash' | 'mpesa' | 'card' | 'bank_transfer' | 'cheque' | 'other';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @Type(() => Date)
  date?: Date;

  // If true, payment requires super admin approval before being marked as complete
  // Typically used for send money, bank transfer payments
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;
}

export class InvoiceFiltersDto {
  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  skip?: string;
}
