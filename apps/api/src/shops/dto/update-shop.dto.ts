import {
  IsOptional,
  IsString,
  IsEmail,
  IsNumber,
  Matches,
  MaxLength,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
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

const ALL_REGIONS = [...KENYA_COUNTIES, ...AUSTRALIA_STATES];

/**
 * P0-11B: ORDINARY shop-admin update DTO.
 *
 * Deliberately EXCLUDES all privileged or verification fields — status,
 * verificationNotes, verificationDate, verificationBy, rejection and
 * suspension fields, ownerId, shopId, cashierCount, totalSales,
 * totalOrders, onboardingComplete. Status transitions belong exclusively
 * to the canonical super-admin verification workflow:
 * PUT /super-admin/shops/:id/verify, reject, suspend, reactivate.
 */
export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_COUNTRIES, { message: 'Please select a valid country' })
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  county?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessType?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim().toUpperCase();
      return trimmed || undefined; // Return undefined if empty string
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
  @IsIn(SUPPORTED_CURRENCIES, { message: 'Please select a valid currency' })
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  tillNumber?: string;

  /**
   * Accepted for wire compatibility with the Settings page, which includes
   * taxRate in its shop payload. Tax configuration is persisted through the
   * dedicated shop-settings workflow, NOT the Shop document — this field is
   * never written to the Shop (service allowlist excludes it).
   */
  @IsOptional()
  @IsNumber()
  taxRate?: number;
}
