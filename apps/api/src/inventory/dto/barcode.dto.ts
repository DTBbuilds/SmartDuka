import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ScanBarcodeDto {
  @IsString()
  barcode: string;
}

export class GenerateBarcodeDto {
  @IsString()
  productId: string;
}

export class BulkImportBarcodesItemDto {
  @IsString()
  barcode: string;

  @IsString()
  productId: string;
}

export class BulkImportBarcodesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportBarcodesItemDto)
  barcodes: BulkImportBarcodesItemDto[];
}

export class ValidateBarcodeDto {
  @IsString()
  barcode: string;
}
