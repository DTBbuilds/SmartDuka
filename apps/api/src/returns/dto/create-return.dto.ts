import { IsString, IsArray, IsNumber, IsDate, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnItemDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  reason: string;
}

export class CreateReturnDto {
  @IsString()
  orderId: string;

  @IsDate()
  @Type(() => Date)
  orderDate: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @IsString()
  requestedBy: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  returnWindow?: number; // days
}
