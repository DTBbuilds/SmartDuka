import { IsEmail, IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateShopDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

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
}
