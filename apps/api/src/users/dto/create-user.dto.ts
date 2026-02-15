import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsMongoId } from 'class-validator';

export class CreateUserDto {
  @IsMongoId()
  shopId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(['admin', 'cashier'])
  role?: 'admin' | 'cashier';
}
