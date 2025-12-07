import { IsEmail, IsString, IsOptional, MinLength, ValidateNested, Matches, MaxLength, IsIn, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Kenya counties
const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
  "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
  "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu",
  "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana",
  "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

export class ShopInfoDto {
  @IsString()
  @MinLength(2, { message: 'Shop name must be at least 2 characters' })
  @MaxLength(100, { message: 'Shop name must not exceed 100 characters' })
  shopName: string;

  @IsString()
  @MinLength(2, { message: 'Business type is required' })
  businessType: string;

  @IsString()
  @IsIn(KENYA_COUNTIES, { message: 'Please select a valid county' })
  county: string;

  @IsString()
  @MinLength(2, { message: 'City/Town is required' })
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toUpperCase();
      return trimmed || undefined; // Return undefined if empty string
    }
    return undefined;
  })
  @ValidateIf((o) => o.kraPin !== undefined && o.kraPin !== null && o.kraPin !== '')
  @IsString()
  @Matches(/^[A-Z][0-9]{9}[A-Z]$/, { 
    message: 'Invalid KRA PIN format (e.g., A123456789B)',
  })
  kraPin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  subscriptionPlanCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'annual'])
  billingCycle?: string;
}

export class AdminInfoDto {
  @IsString()
  @MinLength(2, { message: 'Admin name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(10, { message: 'Phone number must be at least 10 digits' })
  @MaxLength(15)
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

export class RegisterShopDto {
  @ValidateNested()
  @Type(() => ShopInfoDto)
  shop: ShopInfoDto;

  @ValidateNested()
  @Type(() => AdminInfoDto)
  admin: AdminInfoDto;
}
