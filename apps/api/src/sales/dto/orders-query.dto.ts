import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class OrdersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(['pending', 'completed', 'void'])
  status?: 'pending' | 'completed' | 'void';

  @IsOptional()
  @IsEnum(['unpaid', 'partial', 'paid'])
  paymentStatus?: 'unpaid' | 'partial' | 'paid';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}
