import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class RequestStockTransferDto {
  @IsString()
  fromLocationId: string;

  @IsString()
  toLocationId: string;

  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveStockTransferDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectStockTransferDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetTransferHistoryDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
