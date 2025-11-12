import { IsString, IsEnum, IsNumber, IsObject, IsOptional, IsArray, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DiscountRuleDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsArray()
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  applicableCategories?: string[];

  @IsDate()
  @Type(() => Date)
  validFrom: Date;

  @IsDate()
  @Type(() => Date)
  validTo: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableDays?: string[];

  @IsOptional()
  @IsObject()
  applicableHours?: { start: number; end: number };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerSegments?: string[];
}

export class CreateDiscountDto {
  @IsString()
  name: string;

  @IsEnum(['percentage', 'fixed', 'bogo', 'tiered', 'coupon'])
  type: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'coupon';

  @IsNumber()
  @Min(0)
  value: number;

  @IsObject()
  @Type(() => DiscountRuleDto)
  rules: DiscountRuleDto;

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
