import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  ValidateNested,
  Matches,
  MaxLength,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_COUNTRIES,
} from '../../common/currency';

// Kenya counties
const KENYA_COUNTIES = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  "Murang'a",
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans-Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
];

// Australian states/territories
const AUSTRALIA_STATES = [
  'Australian Capital Territory',
  'New South Wales',
  'Northern Territory',
  'Queensland',
  'South Australia',
  'Tasmania',
  'Victoria',
  'Western Australia',
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
  @MaxLength(100)
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
  @ValidateIf(
    (o) =>
      o.country === 'KE' &&
      o.kraPin !== undefined &&
      o.kraPin !== null &&
      o.kraPin !== '',
  )
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

/**
 * P0-11B — GOOGLE REGISTRATION VALIDATION PARITY
 *
 * The Google registration endpoint previously used an inline TypeScript body
 * type, which the global ValidationPipe cannot validate (compile-time-only,
 * no runtime metatype). These classes give the Google path the same
 * server-enforced validation as the email path: supported country/currency
 * enums, string lengths, KRA PIN format, and whitelist/forbidNonWhitelisted
 * rejection of unknown or privileged fields (e.g. a crafted `status`).
 *
 * Email OTP is intentionally NOT required — the Google OAuth flow supplies a
 * verified identity. This is validation parity, not an OAuth redesign.
 */
export class GoogleProfileDto {
  @IsString()
  @MinLength(1)
  googleId: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class GoogleShopDto {
  @IsString()
  @MinLength(2, { message: 'Shop name must be at least 2 characters' })
  @MaxLength(100, { message: 'Shop name must not exceed 100 characters' })
  shopName: string;

  @IsString()
  @MinLength(2, { message: 'Business type is required' })
  @MaxLength(100)
  businessType: string;

  @IsString()
  @IsIn(SUPPORTED_COUNTRIES, { message: 'Please select a valid country' })
  country: string;

  @IsString()
  @MaxLength(100)
  county: string;

  @IsString()
  @MinLength(2, { message: 'City/Town is required' })
  @MaxLength(100)
  city: string;

  @IsString()
  @IsIn(SUPPORTED_CURRENCIES, { message: 'Please select a valid currency' })
  currency: string;

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
  @ValidateIf(
    (o) => o.kraPin !== undefined && o.kraPin !== null && o.kraPin !== '',
  )
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
  @MaxLength(20)
  phone?: string;
}

export class RegisterShopGoogleDto {
  @ValidateNested()
  @Type(() => GoogleProfileDto)
  googleProfile: GoogleProfileDto;

  @ValidateNested()
  @Type(() => GoogleShopDto)
  shop: GoogleShopDto;
}
