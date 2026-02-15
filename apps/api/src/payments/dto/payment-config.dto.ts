import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsMongoId,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { PaymentProvider, ConfigEnvironment, ConfigStatus } from '../schemas/payment-config.schema';

/**
 * DTO for creating a new payment configuration
 */
export class CreatePaymentConfigDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsEnum(ConfigEnvironment)
  environment: ConfigEnvironment;

  @IsString()
  @MaxLength(20)
  shortCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountPrefix?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsString()
  consumerKey?: string;

  @IsOptional()
  @IsString()
  consumerSecret?: string;

  @IsOptional()
  @IsString()
  passkey?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Max(150000)
  maxAmount?: number;

  @IsOptional()
  @IsNumber()
  dailyLimit?: number;

  @IsOptional()
  @IsNumber()
  monthlyLimit?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a payment configuration
 */
export class UpdatePaymentConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  shortCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountPrefix?: string;

  @IsOptional()
  @IsString()
  consumerKey?: string;

  @IsOptional()
  @IsString()
  consumerSecret?: string;

  @IsOptional()
  @IsString()
  passkey?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Max(150000)
  maxAmount?: number;

  @IsOptional()
  @IsNumber()
  dailyLimit?: number;

  @IsOptional()
  @IsNumber()
  monthlyLimit?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for listing payment configurations with filters
 */
export class ListPaymentConfigsDto {
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @IsOptional()
  @IsEnum(ConfigEnvironment)
  environment?: ConfigEnvironment;

  @IsOptional()
  @IsEnum(ConfigStatus)
  status?: ConfigStatus;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for rotating credentials
 */
export class RotateCredentialsDto {
  @IsString()
  consumerKey: string;

  @IsString()
  consumerSecret: string;

  @IsString()
  passkey: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for deactivating a config
 */
export class DeactivateConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO for deleting a config
 */
export class DeleteConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Response DTO for payment config (masks sensitive data)
 */
export class PaymentConfigResponseDto {
  _id: string;
  shopId: string;
  branchId?: string;
  provider: PaymentProvider;
  environment: ConfigEnvironment;
  name: string;
  shortCode: string;
  accountPrefix?: string;
  callbackUrl?: string;
  status: ConfigStatus;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  hasCredentials: boolean;
  maskedConsumerKey?: string;
  verifiedAt?: Date;
  lastTestedAt?: Date;
  lastTestResult?: string;
  version: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  totalTransactions: number;
  successfulTransactions: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;

  static fromDocument(doc: any): PaymentConfigResponseDto {
    const hasCredentials = !!(
      doc.credentials?.consumerKey &&
      doc.credentials?.consumerSecret &&
      doc.credentials?.passkey
    );

    // Mask consumer key (show last 4 chars only)
    let maskedConsumerKey: string | undefined;
    if (doc.credentials?.consumerKey) {
      // The stored value is encrypted, so we can't show last 4 chars
      // Just indicate it's set
      maskedConsumerKey = '****configured';
    }

    return {
      _id: doc._id.toString(),
      shopId: doc.shopId.toString(),
      branchId: doc.branchId?.toString(),
      provider: doc.provider,
      environment: doc.environment,
      name: doc.name,
      shortCode: doc.shortCode,
      accountPrefix: doc.accountPrefix,
      callbackUrl: doc.callbackUrl,
      status: doc.status,
      priority: doc.priority,
      isActive: doc.isActive,
      isDefault: doc.isDefault,
      hasCredentials,
      maskedConsumerKey,
      verifiedAt: doc.verifiedAt,
      lastTestedAt: doc.lastTestedAt,
      lastTestResult: doc.lastTestResult,
      version: doc.version,
      minAmount: doc.minAmount,
      maxAmount: doc.maxAmount,
      dailyLimit: doc.dailyLimit,
      monthlyLimit: doc.monthlyLimit,
      totalTransactions: doc.totalTransactions || 0,
      successfulTransactions: doc.successfulTransactions || 0,
      successRate: doc.totalTransactions > 0
        ? (doc.successfulTransactions / doc.totalTransactions) * 100
        : 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
