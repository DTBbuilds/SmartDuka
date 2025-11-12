import { IsDateString, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SalesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(['pending', 'completed', 'void'])
  status?: 'pending' | 'completed' | 'void';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}
