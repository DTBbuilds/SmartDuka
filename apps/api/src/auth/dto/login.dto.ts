import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsMongoId } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(['admin', 'cashier', 'super_admin'])
  role?: 'admin' | 'cashier' | 'super_admin';

  @IsOptional()
  @IsMongoId()
  shopId?: string;
}
