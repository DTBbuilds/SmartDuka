import { IsString, IsOptional, IsPhoneNumber, MinLength } from 'class-validator';

export class CreateCashierDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsPhoneNumber('KE')
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
