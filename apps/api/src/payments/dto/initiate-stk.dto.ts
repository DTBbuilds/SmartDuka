import { IsEmail, IsNumber, IsPhoneNumber, IsString, IsOptional, Min, MinLength } from 'class-validator';

export class InitiateStkDto {
  @IsPhoneNumber('KE')
  phoneNumber: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @MinLength(1)
  orderId: string;

  @IsString()
  @MinLength(1)
  accountReference: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  @IsOptional()
  transactionDesc?: string;
}
