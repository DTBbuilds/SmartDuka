import { IsString, IsOptional, IsPhoneNumber, MinLength, IsMongoId, IsObject } from 'class-validator';

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
