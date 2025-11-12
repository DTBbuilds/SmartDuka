import { IsString, IsEnum, IsNumber, IsObject, IsOptional, IsArray, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountRuleDto } from './create-discount.dto';

export class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['percentage', 'fixed', 'bogo', 'tiered', 'coupon'])
  type?: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'coupon';

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsObject()
  @Type(() => DiscountRuleDto)
  rules?: DiscountRuleDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @IsOptional()
  requiresApproval?: boolean;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
