import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateDailyReconciliationDto {
  @IsNumber()
  @Min(0)
  actualCash: number;

  @IsOptional()
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

  @IsOptional()
  @IsString()
  status?: string;
}

export class InvestigateVarianceDto {
  @IsString()
  varianceType: string;

  @IsString()
  investigationNotes: string;
}

export class ApproveReconciliationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
