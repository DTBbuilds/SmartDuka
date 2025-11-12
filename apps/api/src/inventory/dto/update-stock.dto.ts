import { IsNumber, IsString, Min } from 'class-validator';

export class UpdateStockDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(-1000)
  quantityChange: number; // positive for restock, negative for deduction
}
