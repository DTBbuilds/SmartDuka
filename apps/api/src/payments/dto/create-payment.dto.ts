import { IsString, IsNumber, IsOptional, IsEnum, IsMongoId, Min, IsBoolean } from 'class-validator';

export class CreatePaymentDto {
  @IsMongoId()
  orderId: string;

  @IsString()
  orderNumber: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string; // Defaults to 'KES'

  @IsEnum(['cash', 'mpesa', 'card', 'bank_transfer', 'credit', 'cheque', 'other'])
  method: string;

  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status?: string;

  // M-Pesa fields
  @IsOptional()
  @IsString()
  mpesaReceiptNumber?: string;

  @IsOptional()
  @IsString()
  mpesaTransactionId?: string;

  @IsOptional()
  @IsString()
  mpesaPhoneNumber?: string;

  @IsOptional()
  @IsString()
  mpesaCheckoutRequestId?: string;

  // Card fields
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  cardAuthCode?: string;

  // Bank fields
  @IsOptional()
  @IsString()
  bankReference?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  // General
  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  externalTransactionId?: string;

  // Customer
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  // Shift
  @IsOptional()
  @IsMongoId()
  shiftId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentStatusDto {
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status: string;

  @IsOptional()
  @IsString()
  mpesaReceiptNumber?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReversePaymentDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReconcilePaymentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PaymentQueryDto {
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'reversed', 'refunded'])
  status?: string;

  @IsOptional()
  @IsEnum(['cash', 'mpesa', 'card', 'bank_transfer', 'credit', 'cheque', 'other'])
  method?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  orderId?: string;

  @IsOptional()
  @IsMongoId()
  shiftId?: string;

  @IsOptional()
  @IsBoolean()
  isReconciled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  skip?: number;
}
