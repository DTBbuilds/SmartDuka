import { IsOptional, IsString, IsEnum, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z][0-9]{9}[A-Z]$/, { message: 'Invalid KRA PIN format' })
  kraPin?: string;

  @IsOptional()
  @IsEnum(['pending', 'verified', 'active', 'suspended'])
  status?: 'pending' | 'verified' | 'active' | 'suspended';

  @IsOptional()
  @IsString()
  verificationNotes?: string;
}
