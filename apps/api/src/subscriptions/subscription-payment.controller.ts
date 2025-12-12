import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { PaymentAttemptService } from './services/payment-attempt.service';
import { PaymentMethod, PaymentAttemptType } from './schemas/payment-attempt.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SubscriptionPaymentDto } from './dto/subscription.dto';

/**
 * Subscription Payment Controller
 * 
 * Handles M-Pesa payments for subscription invoices
 * Payment options:
 * 1. STK Push - Automated payment prompt
 * 2. Send Money - Manual payment to 0729983567
 */
@Controller('subscriptions/payments')
export class SubscriptionPaymentController {
  private readonly logger = new Logger(SubscriptionPaymentController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mpesaService: SubscriptionMpesaService,
    private readonly paymentAttemptService: PaymentAttemptService,
  ) {}

  /**
   * Initiate M-Pesa STK Push payment for an invoice
   * 
   * This endpoint triggers an STK push to the customer's phone
   * for subscription payment to SmartDuka (0729983567)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('mpesa/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateMpesaPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubscriptionPaymentDto,
  ): Promise<{
    success: boolean;
    message: string;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    error?: string;
  }> {
    this.logger.log(`Initiating M-Pesa STK Push for invoice ${dto.invoiceId}`);

    const result = await this.mpesaService.initiateSubscriptionPayment(
      dto.invoiceId,
      dto.phoneNumber,
      user.shopId,
    );

    return result;
  }

  /**
   * Initiate M-Pesa STK Push for plan upgrade
   * 
   * This endpoint initiates payment WITHOUT changing the plan.
   * The plan will only be upgraded after payment is confirmed via callback.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('mpesa/initiate-upgrade')
  @HttpCode(HttpStatus.OK)
  async initiateUpgradePayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { 
      phoneNumber: string; 
      planCode: string; 
      billingCycle: 'monthly' | 'annual';
      amount: number;
    },
  ): Promise<{
    success: boolean;
    message: string;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    error?: string;
  }> {
    this.logger.log(`Initiating upgrade payment for shop ${user.shopId} to plan ${dto.planCode}`);

    // Track payment attempt
    const attempt = await this.paymentAttemptService.createAttempt({
      shopId: user.shopId,
      userEmail: user.email,
      method: PaymentMethod.MPESA_STK,
      type: PaymentAttemptType.UPGRADE,
      amount: dto.amount,
      planCode: dto.planCode,
      billingCycle: dto.billingCycle,
      phoneNumber: dto.phoneNumber,
      metadata: { source: 'subscription_upgrade' },
    });

    const result = await this.mpesaService.initiateUpgradePayment(
      dto.phoneNumber,
      user.shopId,
      dto.planCode,
      dto.billingCycle,
      dto.amount,
    );

    // Update attempt with result
    if (result.success && result.checkoutRequestId) {
      await this.paymentAttemptService.updateWithStkDetails(
        attempt._id.toString(),
        result.checkoutRequestId,
        result.merchantRequestId || '',
      );
    } else {
      await this.paymentAttemptService.markFailed(
        attempt._id.toString(),
        result.error,
        result.message,
      );
    }

    return result;
  }

  /**
   * Get manual payment instructions
   * 
   * Returns instructions for sending money directly to 0729983567
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('manual-instructions/:invoiceId')
  async getManualPaymentInstructions(
    @CurrentUser() user: JwtPayload,
    @Param('invoiceId') invoiceId: string,
  ): Promise<{
    success: boolean;
    phoneNumber?: string;
    amount?: number;
    reference?: string;
    instructions?: string[];
    message?: string;
  }> {
    const invoice = await this.subscriptionsService.getInvoice(user.shopId, invoiceId);

    if (!invoice) {
      return {
        success: false,
        message: 'Invoice not found',
      };
    }

    if (invoice.status === 'paid') {
      return {
        success: false,
        message: 'Invoice is already paid',
      };
    }

    const instructions = this.mpesaService.getManualPaymentInstructions(
      invoice.invoiceNumber,
      invoice.totalAmount,
    );

    return {
      success: true,
      ...instructions,
    };
  }

  /**
   * Confirm manual M-Pesa payment
   * 
   * Customer enters their M-Pesa receipt number after sending money
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('manual/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmManualPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { invoiceId: string; mpesaReceiptNumber: string; paidAmount: number },
  ): Promise<{
    success: boolean;
    message: string;
    mpesaReceiptNumber?: string;
  }> {
    this.logger.log(`Confirming manual payment for invoice ${dto.invoiceId}`);

    const result = await this.mpesaService.confirmManualPayment(
      dto.invoiceId,
      user.shopId,
      dto.mpesaReceiptNumber,
      dto.paidAmount,
    );

    return result;
  }

  /**
   * Confirm manual M-Pesa payment for plan upgrade
   * 
   * Verifies receipt and upgrades plan only if payment is valid
   * Does NOT change plan before verification
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('manual/confirm-upgrade')
  @HttpCode(HttpStatus.OK)
  async confirmManualUpgradePayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { 
      mpesaReceiptNumber: string; 
      planCode: string;
      billingCycle: 'monthly' | 'annual';
      amount: number;
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Confirming manual upgrade payment for shop ${user.shopId} to plan ${dto.planCode}`);

    // Track payment attempt
    const attempt = await this.paymentAttemptService.createAttempt({
      shopId: user.shopId,
      userEmail: user.email,
      method: PaymentMethod.MPESA_MANUAL,
      type: PaymentAttemptType.UPGRADE,
      amount: dto.amount,
      planCode: dto.planCode,
      billingCycle: dto.billingCycle,
      metadata: { 
        source: 'subscription_upgrade_manual',
        mpesaReceiptNumber: dto.mpesaReceiptNumber,
      },
    });

    const result = await this.mpesaService.confirmManualUpgradePayment(
      user.shopId,
      dto.mpesaReceiptNumber,
      dto.planCode,
      dto.billingCycle,
      dto.amount,
    );

    // Update attempt with result
    if (result.success) {
      await this.paymentAttemptService.markSuccess(
        attempt._id.toString(),
        dto.mpesaReceiptNumber,
      );
    } else {
      await this.paymentAttemptService.markFailed(
        attempt._id.toString(),
        'VERIFICATION_FAILED',
        result.message,
      );
    }

    return result;
  }

  /**
   * M-Pesa callback for subscription payments
   * 
   * This endpoint receives payment confirmation from M-Pesa
   * Note: This is a public endpoint (no auth) as M-Pesa sends callbacks directly
   */
  @Post('mpesa/callback')
  @HttpCode(HttpStatus.OK)
  async handleMpesaCallback(
    @Body() payload: any,
  ): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Received M-Pesa callback for subscription payment');

    try {
      await this.mpesaService.handleStkCallback(payload);
      return { ResultCode: 0, ResultDesc: 'Callback processed' };
    } catch (error: any) {
      this.logger.error(`Callback processing error: ${error.message}`);
      return { ResultCode: 0, ResultDesc: 'Callback received' };
    }
  }

  /**
   * Check payment status for an invoice
   */
  @UseGuards(JwtAuthGuard)
  @Get('status/:invoiceId')
  async getPaymentStatus(
    @CurrentUser() user: JwtPayload,
    @Param('invoiceId') invoiceId: string,
  ): Promise<{
    invoiceId: string;
    status: string;
    paidAt?: Date;
    paymentReference?: string;
  }> {
    const invoice = await this.subscriptionsService.getInvoice(user.shopId, invoiceId);

    return {
      invoiceId: invoice.id,
      status: invoice.status,
      paidAt: invoice.paidAt,
      paymentReference: invoice.paymentReference,
    };
  }

  /**
   * Manual payment confirmation (for bank transfers, etc.)
   * Only accessible by super admin
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('confirm/:invoiceId')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @CurrentUser() user: JwtPayload,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: { paymentMethod: string; paymentReference: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Confirming payment for invoice ${invoiceId}`);

    try {
      await this.subscriptionsService.markInvoicePaid(
        invoiceId,
        dto.paymentMethod,
        dto.paymentReference,
      );

      return {
        success: true,
        message: 'Payment confirmed successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Query STK Push transaction status
   */
  @UseGuards(JwtAuthGuard)
  @Get('stk-status/:checkoutRequestId')
  async queryStkStatus(
    @Param('checkoutRequestId') checkoutRequestId: string,
  ): Promise<{
    success: boolean;
    resultCode?: number;
    resultDesc?: string;
  }> {
    return this.mpesaService.queryStkStatus(checkoutRequestId);
  }

  /**
   * Get payment summary with instructions
   */
  @UseGuards(JwtAuthGuard)
  @Get('summary/:invoiceId')
  async getPaymentSummary(
    @CurrentUser() user: JwtPayload,
    @Param('invoiceId') invoiceId: string,
  ): Promise<{
    success: boolean;
    amount?: number;
    formattedAmount?: string;
    recipient?: string;
    recipientName?: string;
    reference?: string;
    stkPushInstructions?: string[];
    sendMoneyInstructions?: string[];
    message?: string;
  }> {
    const invoice = await this.subscriptionsService.getInvoice(user.shopId, invoiceId);

    if (!invoice) {
      return {
        success: false,
        message: 'Invoice not found',
      };
    }

    if (invoice.status === 'paid') {
      return {
        success: false,
        message: 'Invoice is already paid',
      };
    }

    const summary = this.mpesaService.getPaymentSummary(
      invoice.totalAmount,
      invoice.invoiceNumber,
    );

    return {
      success: true,
      ...summary,
    };
  }

  /**
   * Validate M-Pesa receipt number format
   */
  @Post('validate-receipt')
  @HttpCode(HttpStatus.OK)
  async validateReceipt(
    @Body() dto: { receiptNumber: string },
  ): Promise<{ valid: boolean; message?: string }> {
    return this.mpesaService.validateReceiptNumber(dto.receiptNumber);
  }

  /**
   * Get all payments pending verification (Super Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('pending-verification')
  async getPendingVerificationPayments(): Promise<{
    success: boolean;
    payments: any[];
  }> {
    const payments = await this.subscriptionsService.getPendingVerificationPayments();
    return {
      success: true,
      payments,
    };
  }

  /**
   * Verify a manual payment (Super Admin only)
   * This marks the invoice as paid and activates the subscription
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('verify/:invoiceId')
  @HttpCode(HttpStatus.OK)
  async verifyManualPayment(
    @CurrentUser() user: JwtPayload,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: { approved: boolean; notes?: string },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Super admin ${user.email} verifying payment for invoice ${invoiceId}`);

    try {
      if (dto.approved) {
        await this.subscriptionsService.verifyAndActivatePayment(invoiceId, user.sub);
        return {
          success: true,
          message: 'Payment verified and subscription activated',
        };
      } else {
        await this.subscriptionsService.rejectPayment(invoiceId, dto.notes || 'Payment rejected by admin');
        return {
          success: true,
          message: 'Payment rejected',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
