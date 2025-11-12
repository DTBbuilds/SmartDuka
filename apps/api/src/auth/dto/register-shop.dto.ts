import { IsEmail, IsString, IsOptional, MinLength, ValidateNested, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';

export class ShopInfoDto {
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

export class AdminInfoDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
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
