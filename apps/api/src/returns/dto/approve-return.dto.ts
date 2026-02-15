import { IsString, IsOptional } from 'class-validator';

export class ApproveReturnDto {
  @IsString()
  approvedBy: string;

  @IsOptional()
  @IsString()
  approvalNotes?: string;
}
