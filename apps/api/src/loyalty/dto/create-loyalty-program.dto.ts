import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LoyaltyTierDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  minPoints: number;

  @IsNumber()
  @Min(0)
  discountPercentage: number;

  @IsNumber()
  @Min(0)
  bonusPointsMultiplier: number;
}

export class CreateLoyaltyProgramDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  pointsPerKsh: number;

  @IsNumber()
  @Min(0)
  pointsExpiryDays: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoyaltyTierDto)
  tiers: LoyaltyTierDto[];

  @IsOptional()
  @IsBoolean()
  enableBirthdayBonus?: boolean;

  @IsOptional()
  @IsNumber()
  birthdayBonusPoints?: number;

  @IsOptional()
  @IsBoolean()
  enableReferralBonus?: boolean;

  @IsOptional()
  @IsNumber()
  referralBonusPoints?: number;
}
