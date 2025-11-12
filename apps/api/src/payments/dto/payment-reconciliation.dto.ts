import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreatePaymentReconciliationDto {
  @IsNumber()
  @Min(0)
  actualCash: number;

  @IsString()
  reconciliationNotes?: string;
}

export class GetReconciliationHistoryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class MatchTransactionsDto {
  @IsString()
  mpesaTransactionIds: string[];
}
