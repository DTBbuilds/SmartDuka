import {
  IsString,
  IsOptional,
  IsNumber,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * P0-11C — subscription invoice card-payment initiation.
 *
 * `invoiceId` is the canonical authority; every other field is an OPTIONAL
 * CONSISTENCY ASSERTION only — the server derives amount, currency and
 * invoiceNumber from the stored tenant-bound invoice and rejects on
 * mismatch. The browser can never choose what is charged.
 */
export class CreateSubscriptionInvoicePaymentDto {
  @IsString()
  @Matches(/^[a-fA-F0-9]{24}$/, {
    message: 'invoiceId must be a valid invoice identifier',
  })
  invoiceId: string;

  /** Optional consistency assertion — must equal the stored invoice number. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  invoiceNumber?: string;

  /** Optional consistency assertion — minor units, must equal the invoice total. */
  @IsOptional()
  @IsNumber()
  amount?: number;

  /** Optional consistency assertion — must equal the invoice currency. */
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
