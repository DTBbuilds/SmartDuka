import { IsString, IsOptional } from 'class-validator';

export class ReversePaymentDto {
  @IsString()
  orderId: string;

  @IsString()
  paymentId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetReversalHistoryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
