import { Controller, Get, UseGuards, Logger, Optional } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { MpesaMultiTenantService } from './services/mpesa-multi-tenant.service';
import { StripeConnectService } from '../stripe/services/stripe-connect.service';

export interface PaymentReadinessStatus {
  /** True if at least ONE payment method (mpesa/card/cash) is configured and ready */
  hasAnyPaymentMethod: boolean;
  /** Cash is always available — no configuration needed */
  cashReady: true;
  mpesa: {
    configured: boolean;
    enabled: boolean;
    verified: boolean;
    ready: boolean;
    shortCode?: string;
    type?: 'paybill' | 'till';
    message: string;
  };
  card: {
    connected: boolean;
    chargesEnabled: boolean;
    ready: boolean;
    accountId?: string;
    displayName?: string;
    message: string;
  };
  /** Warnings for admins/cashiers */
  warnings: string[];
  /** Critical — blocks non-cash payments entirely */
  blockers: string[];
}

@Controller('payments/readiness')
export class PaymentReadinessController {
  private readonly logger = new Logger(PaymentReadinessController.name);

  constructor(
    private readonly mpesaMultiTenantService: MpesaMultiTenantService,
    @Optional() private readonly stripeConnectService?: StripeConnectService,
  ) {}

  /**
   * GET /payments/readiness
   *
   * Returns a consolidated view of all payment method readiness for the shop.
   * Used by admin dashboard, POS, and cashier screens to decide which payment
   * options to enable and which warnings to show.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getReadiness(@CurrentUser() user: JwtPayload): Promise<PaymentReadinessStatus> {
    const shopId = user.shopId;
    const warnings: string[] = [];
    const blockers: string[] = [];

    // ── M-Pesa ──
    let mpesaResult = {
      configured: false,
      enabled: false,
      verified: false,
      ready: false,
      shortCode: undefined as string | undefined,
      type: undefined as 'paybill' | 'till' | undefined,
      message: 'M-Pesa not configured.',
    };
    try {
      const mpesa = await this.mpesaMultiTenantService.getMpesaConfigStatus(shopId);
      mpesaResult = {
        configured: mpesa.isConfigured,
        enabled: mpesa.isEnabled,
        verified: mpesa.isVerified,
        ready: mpesa.isConfigured && mpesa.isEnabled && mpesa.isVerified,
        shortCode: mpesa.shortCode,
        type: mpesa.type,
        message: mpesa.message,
      };
      if (!mpesa.isConfigured) {
        warnings.push('M-Pesa is not configured. Mobile payments are disabled.');
      } else if (!mpesa.isEnabled) {
        warnings.push('M-Pesa credentials saved but not enabled.');
      } else if (!mpesa.isVerified) {
        warnings.push('M-Pesa credentials pending verification.');
      }
    } catch (err: any) {
      this.logger.error(`M-Pesa readiness check failed for shop ${shopId}: ${err.message}`);
      mpesaResult.message = 'Failed to check M-Pesa status.';
      warnings.push('Could not check M-Pesa status.');
    }

    // ── Stripe / Card ──
    let cardResult = {
      connected: false,
      chargesEnabled: false,
      ready: false,
      accountId: undefined as string | undefined,
      displayName: undefined as string | undefined,
      message: 'Card payments not configured.',
    };
    try {
      if (this.stripeConnectService) {
        const stripe = await this.stripeConnectService.getStatus(shopId);
        cardResult = {
          connected: stripe.isConnected,
          chargesEnabled: stripe.chargesEnabled ?? false,
          ready: stripe.isCardReady,
          accountId: stripe.accountId,
          displayName: stripe.displayName,
          message: stripe.isCardReady
            ? 'Card payments active.'
            : stripe.isConnected
              ? 'Stripe connected but charges not enabled. Complete onboarding in Stripe.'
              : 'Stripe not connected. Card payments are disabled.',
        };
        if (!stripe.isConnected) {
          warnings.push('Stripe is not connected. Card payments (Visa, Mastercard) are disabled.');
        } else if (!stripe.isCardReady) {
          warnings.push('Stripe is connected but charges not enabled. Complete Stripe onboarding.');
        }
      }
    } catch (err: any) {
      this.logger.error(`Stripe readiness check failed for shop ${shopId}: ${err.message}`);
      cardResult.message = 'Failed to check Stripe status.';
      warnings.push('Could not check Stripe/card status.');
    }

    // ── Blockers ──
    if (!mpesaResult.ready && !cardResult.ready) {
      blockers.push(
        'No digital payment method is configured. Customers can only pay with cash. Configure M-Pesa or Stripe in Settings to accept digital payments.',
      );
    }

    return {
      hasAnyPaymentMethod: mpesaResult.ready || cardResult.ready,
      cashReady: true,
      mpesa: mpesaResult,
      card: cardResult,
      warnings,
      blockers,
    };
  }
}
