import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class OrdersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  search?: string;

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
  @IsString()
  branchId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
