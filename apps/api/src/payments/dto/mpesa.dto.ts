import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Matches,
  IsNotEmpty,
  IsEnum,
  IsDefined,
  IsObject,
  ValidateNested,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MpesaTransactionStatus } from '../schemas/mpesa-transaction.schema';

/**
 * Phone number validation regex for Kenyan numbers
 * Accepts: 07XX, 01XX, 254XX, +254XX formats
 */
const KENYAN_PHONE_REGEX = /^(?:\+?254|0)[17]\d{8}$/;

/**
 * DTO for initiating M-Pesa STK Push payment
 */
export class InitiateMpesaPaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(KENYAN_PHONE_REGEX, {
    message: 'Phone number must be a valid Kenyan number (07XX, 01XX, or 254XX format)',
  })
  @Transform(({ value }) => formatPhoneNumber(value))
  phoneNumber: string;

  @IsNumber()
  @Min(1, { message: 'Amount must be at least Ksh 1' })
  @Max(150000, { message: 'Amount cannot exceed Ksh 150,000' })
  amount: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  transactionDesc?: string;
}

/**
 * F-48: validator accepting a metadata `Value` that may be a string OR a
 * number. Safaricom sends `Amount`/`PhoneNumber`/`TransactionDate` as JSON
 * numbers and `MpesaReceiptNumber` as a string, so a plain `@IsString()` or
 * `@IsNumber()` would reject genuine callbacks.
 */
function IsStringOrNumber(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isStringOrNumber',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' || typeof value === 'number',
        defaultMessage: () =>
          'Value must be a string or a number (as sent by Daraja)',
      },
    },
    validationOptions,
  );
}

/**
 * F-48: one CallbackMetadata name/value pair. `Value` is OPTIONAL — the real
 * Safaricom callback sends a `Balance` item with no `Value` at all when the
 * balance is zero, and rejecting it would reject a genuine callback.
 */
export class MpesaCallbackMetadataItemDto {
  @IsString()
  @IsNotEmpty()
  Name: string;

  @IsOptional()
  @IsStringOrNumber()
  Value?: string | number;
}

/**
 * F-48: `CallbackMetadata` — present ONLY on successful payments; Daraja
 * omits it entirely on failure callbacks, so it must stay optional.
 */
export class MpesaCallbackMetadataDto {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MpesaCallbackMetadataItemDto)
  Item?: MpesaCallbackMetadataItemDto[];
}

/**
 * F-48: the `stkCallback` object of a real Daraja STK callback.
 *
 * ResultCode arrives as a JSON number (0 = success, 1032 = cancelled, ...);
 * some Daraja surfaces report it as a numeric string, so it is normalized to
 * a number here. A non-numeric string fails validation (400) — it can never
 * be silently interpreted as success or failure.
 */
export class MpesaStkCallbackDto {
  @IsString()
  @IsNotEmpty()
  MerchantRequestID: string;

  @IsString()
  @IsNotEmpty()
  CheckoutRequestID: string;

  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    return value;
  })
  @IsNumber()
  ResultCode: number;

  @IsOptional()
  @IsString()
  ResultDesc?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MpesaCallbackMetadataDto)
  CallbackMetadata?: MpesaCallbackMetadataDto;
}

/**
 * F-48: the `Body` envelope of a real Daraja STK callback.
 */
export class MpesaCallbackBodyDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MpesaStkCallbackDto)
  stkCallback: MpesaStkCallbackDto;
}

/**
 * DTO for M-Pesa callback payload
 *
 * F-48: this DTO previously declared `Body` with NO class-validator
 * decorators. The global ValidationPipe (`whitelist: true,
 * forbidNonWhitelisted: true`) therefore rejected EVERY callback — including
 * genuine Daraja callbacks — with 400 "property Body should not exist", so
 * no callback ever reached `MpesaService.processCallback`.
 *
 * The structure below mirrors the real Safaricom Daraja STK callback:
 * {
 *   "Body": {
 *     "stkCallback": {
 *       "MerchantRequestID": "29115-34620561-1",
 *       "CheckoutRequestID": "ws_CO_191220191020363925",
 *       "ResultCode": 0,
 *       "ResultDesc": "The service request is processed successfully.",
 *       "CallbackMetadata": {
 *         "Item": [
 *           { "Name": "Amount", "Value": 1245.00 },
 *           { "Name": "MpesaReceiptNumber", "Value": "SGR51YAB3C" },
 *           { "Name": "Balance" },
 *           { "Name": "TransactionDate", "Value": 20191219102115 },
 *           { "Name": "PhoneNumber", "Value": 254712345678 }
 *         ]
 *       }
 *     }
 *   }
 * }
 *
 * Validation only shapes the payload — it is NOT proof of payment. The
 * unsigned callback is still verified server-to-server against Daraja
 * (CASHIER-P0 F-08) before any money is marked received.
 */
export class MpesaCallbackDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MpesaCallbackBodyDto)
  Body: MpesaCallbackBodyDto;
}

/**
 * DTO for querying M-Pesa transaction status
 */
export class MpesaStatusQueryDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}

/**
 * DTO for retrying M-Pesa payment
 */
export class RetryMpesaPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsOptional()
  @IsString()
  @Matches(KENYAN_PHONE_REGEX, {
    message: 'Phone number must be a valid Kenyan number',
  })
  @Transform(({ value }) => (value ? formatPhoneNumber(value) : undefined))
  newPhoneNumber?: string;
}

/**
 * Response DTO for M-Pesa payment initiation
 */
export class MpesaPaymentResponseDto {
  success: boolean;
  transactionId: string;
  checkoutRequestId?: string;
  status: MpesaTransactionStatus;
  expiresAt?: Date;
  message: string;
  isIdempotent?: boolean;
  errorCode?: string;
}

/**
 * Response DTO for M-Pesa transaction status
 */
export class MpesaStatusResponseDto {
  transactionId: string;
  orderId: string;
  orderNumber: string;
  status: MpesaTransactionStatus;
  amount: number;
  phoneNumber: string;
  mpesaReceiptNumber?: string;
  mpesaResultCode?: number;
  mpesaResultDesc?: string;
  expiresAt: Date;
  timeRemaining: number;
  canRetry: boolean;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * DTO for listing pending M-Pesa transactions
 */
export class ListPendingMpesaDto {
  @IsOptional()
  @IsEnum(MpesaTransactionStatus)
  status?: MpesaTransactionStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  skip?: number;
}

/**
 * Parsed callback metadata
 */
export interface ParsedCallbackMetadata {
  amount?: number;
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  transactionDate?: string;
}

/**
 * M-Pesa error response
 */
export class MpesaErrorDto {
  success: false;
  errorCode: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format phone number to 254XXXXXXXXX format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // If starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  }

  // If doesn't start with 254, add it
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }

  return cleaned;
}

/**
 * Mask phone number for display (254712***678)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 9) return phone;
  const formatted = formatPhoneNumber(phone);
  return formatted.slice(0, 6) + '***' + formatted.slice(-3);
}

/**
 * Parse callback metadata from M-Pesa
 *
 * F-48: `Value` is optional — the real callback sends a `Balance` item with
 * no `Value` when the balance is zero. Items without a value are skipped.
 */
export function parseCallbackMetadata(
  items?: Array<{ Name: string; Value?: string | number }>,
): ParsedCallbackMetadata {
  if (!items) return {};

  const result: ParsedCallbackMetadata = {};

  for (const item of items) {
    if (item.Value === undefined || item.Value === null) continue;

    switch (item.Name) {
      case 'Amount':
        result.amount = Number(item.Value);
        break;
      case 'MpesaReceiptNumber':
        result.mpesaReceiptNumber = String(item.Value);
        break;
      case 'PhoneNumber':
        result.phoneNumber = String(item.Value);
        break;
      case 'TransactionDate':
        result.transactionDate = String(item.Value);
        break;
    }
  }

  return result;
}

/**
 * Generate idempotency key
 */
export function generateIdempotencyKey(
  shopId: string,
  orderId: string,
  timestamp?: number,
): string {
  const ts = timestamp || Date.now();
  return `${shopId}-${orderId}-${ts}`;
}

/**
 * Get user-friendly error message from M-Pesa result code
 */
export function getMpesaErrorMessage(resultCode: number): string {
  const errorMessages: Record<number, string> = {
    0: 'Payment successful',
    1: 'Insufficient M-Pesa balance. Please top up and try again.',
    2: 'Amount is less than the minimum allowed.',
    3: 'Amount exceeds the maximum allowed.',
    4: 'Daily transaction limit exceeded.',
    5: 'Invalid amount entered.',
    17: 'M-Pesa system is busy. Please try again in a moment.',
    1032: 'Payment was cancelled. Please try again if you wish to complete the payment.',
    1037: 'Request timed out. Please try again.',
    2001: 'Incorrect M-Pesa PIN entered. Please try again.',
  };

  return errorMessages[resultCode] || `Payment failed (Error code: ${resultCode})`;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(resultCode: number): boolean {
  const retryableCodes = [17, 1037]; // System busy, timeout
  return retryableCodes.includes(resultCode);
}

/**
 * SmartDuka M-Pesa error codes
 */
export enum SmartDukaMpesaErrorCode {
  INVALID_PHONE = 'MPESA_001',
  AMOUNT_TOO_LOW = 'MPESA_002',
  AMOUNT_TOO_HIGH = 'MPESA_003',
  STK_PUSH_FAILED = 'MPESA_004',
  TRANSACTION_EXPIRED = 'MPESA_005',
  DUPLICATE_TRANSACTION = 'MPESA_006',
  CALLBACK_VALIDATION_FAILED = 'MPESA_007',
  TRANSACTION_NOT_FOUND = 'MPESA_008',
  INVALID_STATE_TRANSITION = 'MPESA_009',
  MAX_RETRIES_EXCEEDED = 'MPESA_010',
  ORDER_NOT_FOUND = 'MPESA_011',
  UNAUTHORIZED = 'MPESA_012',
}
