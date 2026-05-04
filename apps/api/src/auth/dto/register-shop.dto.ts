import { IsEmail, IsString, IsOptional, MinLength, ValidateNested, Matches, MaxLength, IsIn, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Supported countries and their codes
const SUPPORTED_COUNTRIES = ['KE', 'AU'];

// Country → currency mapping (used for auto-population on frontend)
const COUNTRY_CURRENCIES: Record<string, string> = {
  KE: 'KES',
  AU: 'AUD',
};

// Valid currencies
const SUPPORTED_CURRENCIES = ['KES', 'AUD', 'USD', 'GBP', 'EUR'];

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

// Australian states/territories
const AUSTRALIA_STATES = [
  "Australian Capital Territory", "New South Wales", "Northern Territory",
  "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia"
];

// All valid regions
const ALL_REGIONS = [...KENYA_COUNTIES, ...AUSTRALIA_STATES];

export class ShopInfoDto {
  @IsString()
  @MinLength(2, { message: 'Shop name must be at least 2 characters' })
  @MaxLength(100, { message: 'Shop name must not exceed 100 characters' })
  shopName: string;

  @IsString()
  @MinLength(2, { message: 'Business type is required' })
  businessType: string;

  @IsString()
  @IsIn(SUPPORTED_COUNTRIES, { message: 'Please select a valid country' })
  country: string;

  @IsString()
  @IsIn(ALL_REGIONS, { message: 'Please select a valid region/county/state' })
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
      return trimmed || undefined;
    }
    return undefined;
  })
  @ValidateIf((o) => o.country === 'KE' && o.kraPin !== undefined && o.kraPin !== null && o.kraPin !== '')
  @IsString()
  @Matches(/^[A-Z][0-9]{9}[A-Z]$/, { 
    message: 'Invalid KRA PIN format (e.g., A123456789B)',
  })
  kraPin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsIn(SUPPORTED_CURRENCIES, { message: 'Please select a valid currency' })
  currency: string;

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
