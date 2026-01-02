import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max, Matches, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== NESTED DTOs (must be defined first) ====================

export class ReportScheduleDto {
  @IsOptional()
  @IsBoolean()
  daily?: boolean;

  @IsOptional()
  @IsBoolean()
  weekly?: boolean;

  @IsOptional()
  @IsBoolean()
  monthly?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Time must be in HH:MM format' })
  dailyTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  weeklyDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  monthlyDay?: number;
}

export class AlertPreferencesDto {
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  salesAnomaly?: boolean;

  @IsOptional()
  @IsBoolean()
  cashVariance?: boolean;

  @IsOptional()
  @IsBoolean()
  highSales?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentIssues?: boolean;
}

export class QuietHoursDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  start?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  end?: string;
}

// ==================== SEND MESSAGE DTOs ====================

export class SendTextMessageDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format (e.g., +254712345678)' })
  to: string;

  @IsString()
  content: string;

  @IsEnum(['report', 'alert', 'notification', 'verification', 'test'])
  category: string;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  reportType?: string;

  @IsOptional()
  @IsEnum(['low_stock', 'sales_anomaly', 'cash_variance', 'payment_issue', 'high_sales'])
  alertType?: string;
}

export class SendTemplateMessageDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  to: string;

  @IsString()
  templateName: string;

  @IsOptional()
  templateParams?: Record<string, any>;

  @IsEnum(['report', 'alert', 'notification', 'verification'])
  category: string;
}

// ==================== CONFIGURATION DTOs ====================

export class UpdateWhatsAppConfigDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format' })
  adminPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalRecipients?: string[];

  @IsOptional()
  @Type(() => ReportScheduleDto)
  reportSchedule?: ReportScheduleDto;

  @IsOptional()
  @Type(() => AlertPreferencesDto)
  alertPreferences?: AlertPreferencesDto;

  @IsOptional()
  @IsEnum(['whatsapp', 'email', 'both'])
  deliveryChannel?: string;

  @IsOptional()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxMessagesPerDay?: number;
}

// ==================== VERIFICATION DTOs ====================

export class VerifyPhoneDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format' })
  phoneNumber: string;
}

export class ConfirmVerificationDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;
}

// ==================== WEBHOOK DTOs ====================

export class MetaWebhookDto {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
          }>;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
        }>;
      };
      field: string;
    }>;
  }>;
}
