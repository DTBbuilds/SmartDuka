import { IsString, IsOptional, IsPhoneNumber, MinLength, IsMongoId, IsObject, IsEmail } from 'class-validator';

export class CreateCashierDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber('KE')
  phone?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsObject()
  permissions?: {
    canVoid?: boolean;
    canRefund?: boolean;
    canDiscount?: boolean;
    maxDiscountAmount?: number;
    maxRefundAmount?: number;
    voidRequiresApproval?: boolean;
    refundRequiresApproval?: boolean;
    discountRequiresApproval?: boolean;
  };
}
