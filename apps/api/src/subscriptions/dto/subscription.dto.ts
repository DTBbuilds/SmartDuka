import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsDate, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle, SubscriptionStatus } from '../schemas/subscription.schema';

/**
 * DTO for creating a new subscription
 */
export class CreateSubscriptionDto {
  @IsString()
  planCode: string; // 'starter', 'basic', 'silver', 'gold', 'daily'

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle = BillingCycle.MONTHLY;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  numberOfDays?: number; // For daily billing - how many days to pay for (1-365)

  @IsString()
  @IsOptional()
  promoCode?: string;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean = true;
}

/**
 * DTO for upgrading/downgrading subscription
 */
export class ChangePlanDto {
  @IsString()
  newPlanCode: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsBoolean()
  @IsOptional()
  immediate?: boolean = true; // Apply immediately or at end of billing period
}

/**
 * DTO for subscription payment via M-Pesa
 */
export class SubscriptionPaymentDto {
  @IsString()
  invoiceId: string;

  @IsString()
  phoneNumber: string; // M-Pesa phone number

  @IsString()
  @IsOptional()
  customerName?: string;
}

/**
 * DTO for cancelling subscription
 */
export class CancelSubscriptionDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsOptional()
  immediate?: boolean = false; // Cancel immediately or at end of billing period

  @IsBoolean()
  @IsOptional()
  deleteAccount?: boolean = false; // Also request account deletion
}

/**
 * DTO for requesting account deletion
 */
export class RequestAccountDeletionDto {
  @IsString()
  confirmation: string; // Must be "DELETE MY ACCOUNT"
}

/**
 * Response DTO for subscription details
 */
export class SubscriptionResponseDto {
  id: string;
  shopId: string;
  planCode: string;
  planName: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  currentPrice: number;
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate?: Date;
  daysRemaining: number;
  isTrialUsed: boolean;
  trialEndDate?: Date;
  autoRenew: boolean;
  numberOfDays?: number; // For daily billing - how many days were purchased
  isTrialExpired?: boolean; // True if trial period has ended
  
  // Usage vs limits
  usage: {
    shops: { current: number; limit: number };
    employees: { current: number; limit: number };
    products: { current: number; limit: number };
  };

  // Plan features
  features: string[];
}

/**
 * Response DTO for subscription plan
 */
export class SubscriptionPlanResponseDto {
  code: string;
  name: string;
  description?: string;
  dailyPrice: number; // Daily subscription price (KES 99 for daily plan)
  monthlyPrice: number;
  annualPrice: number;
  setupPrice: number;
  maxShops: number;
  maxEmployees: number;
  maxProducts: number;
  features: string[];
  setupIncludes: {
    siteSurvey?: boolean;
    stocktake?: boolean;
    setup?: boolean;
    training?: boolean;
    support?: boolean;
    freeMonths?: number;
  };
  badge?: string;
  colorTheme?: string;
  
  // Calculated fields
  annualSavings: number; // How much saved vs monthly
  pricePerMonth: number; // Monthly equivalent for annual
}

/**
 * Response DTO for invoice
 */
export class InvoiceResponseDto {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  description: string;
  amount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  periodStart?: Date;
  periodEnd?: Date;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  mpesaReceiptNumber?: string;
  createdAt: Date;
}

/**
 * DTO for billing history query
 */
export class BillingHistoryQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip?: number = 0;

  @IsString()
  @IsOptional()
  status?: string;
}

/**
 * DTO for applying promo code
 */
export class ApplyPromoCodeDto {
  @IsString()
  promoCode: string;
}

/**
 * Response DTO for promo code validation
 */
export class PromoCodeResponseDto {
  valid: boolean;
  code: string;
  discountPercentage?: number;
  discountAmount?: number;
  message: string;
  expiresAt?: Date;
}
