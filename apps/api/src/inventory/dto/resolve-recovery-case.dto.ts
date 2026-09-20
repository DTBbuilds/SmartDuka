import { IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';
import { RecoveryResolutionAction } from '../schemas/inventory-claim.schema';

export class ResolveRecoveryCaseDto {
  @IsEnum(['claim', 'claim_item', 'mutation_receipt'])
  kind: 'claim' | 'claim_item' | 'mutation_receipt';

  @IsOptional()
  @IsMongoId()
  claimId?: string;

  /** Product id for claim_item and mutation_receipt cases. */
  @IsOptional()
  @IsString()
  productId?: string;

  /** Receipt id for mutation_receipt cases. */
  @IsOptional()
  @IsString()
  mutationId?: string;

  @IsEnum(RecoveryResolutionAction)
  action: RecoveryResolutionAction;

  /** Operator justification - persisted on the resolution audit record. */
  @IsString()
  @MinLength(3)
  reason: string;
}

export class RecoveryNoteDto {
  @IsString()
  @MinLength(3)
  text: string;
}
