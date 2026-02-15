import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class ApplyDiscountDto {
  @IsString()
  discountId: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsString()
  appliedBy: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerSegment?: string;

  @IsOptional()
  @IsNumber()
  itemCount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
