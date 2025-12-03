import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MpesaService } from './services/mpesa.service';
import { MpesaMultiTenantService } from './services/mpesa-multi-tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  InitiateMpesaPaymentDto,
  MpesaCallbackDto,
  MpesaPaymentResponseDto,
  MpesaStatusResponseDto,
  RetryMpesaPaymentDto,
} from './dto/mpesa.dto';
import { UpdateMpesaConfigDto } from './dto/mpesa-config.dto';

@Controller('payments/mpesa')
export class MpesaController {
  private readonly logger = new Logger(MpesaController.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly mpesaMultiTenantService: MpesaMultiTenantService,
  ) {}

  /**
   * INITIATE M-PESA STK PUSH PAYMENT
   *
   * Sends an STK push to the customer's phone for payment.
   * Implements idempotency - duplicate requests return existing transaction.
   *
   * @param user - Authenticated user (cashier)
   * @param dto - Payment initiation data
   * @returns Payment response with transaction ID and status
   */
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  async initiatePayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiateMpesaPaymentDto,
  ): Promise<MpesaPaymentResponseDto> {
    this.logger.log(
      `Initiating M-Pesa payment for order ${dto.orderId} by user ${user.sub}`,
    );

    // Get order details to populate orderNumber
    // For now, we'll use the orderId as orderNumber if not provided
    // In production, this should fetch from OrdersService
    const orderNumber = `ORD-${dto.orderId.slice(-8).toUpperCase()}`;

    // branchId may be passed in request body or derived from user context
    // For now, we pass undefined - can be enhanced later
    return this.mpesaService.initiatePayment(
      user.shopId,
      user.sub,
      user.name || user.email || 'Cashier',
      undefined, // branchId - can be added to DTO if needed
      dto.orderId,
      orderNumber,
      dto,
    );
  }

  /**
   * M-PESA CALLBACK ENDPOINT
   *
   * Receives payment confirmation/failure from M-Pesa.
   * This endpoint is PUBLIC (no auth) as M-Pesa sends callbacks directly.
   *
   * Security: Callback signature validation is done in the service.
   *
   * @param payload - Callback payload from M-Pesa
   * @returns Acknowledgment response
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Body() payload: MpesaCallbackDto,
  ): Promise<{ ResultCode: number; ResultDesc: string }> {
    this.logger.log('Received M-Pesa callback');

    try {
      return await this.mpesaService.processCallback(payload);
    } catch (error: any) {
      this.logger.error(`Callback processing error: ${error.message}`);
      // Always return success to M-Pesa to prevent retries
      return { ResultCode: 0, ResultDesc: 'Callback received' };
    }
  }

  /**
   * GET TRANSACTION STATUS
   *
   * Returns the current status of an M-Pesa transaction.
   * Used by frontend to poll for payment completion.
   *
   * @param user - Authenticated user
   * @param id - Transaction ID
   * @returns Transaction status details
   */
  @UseGuards(JwtAuthGuard)
  @Get('status/:id')
  async getTransactionStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<MpesaStatusResponseDto> {
    return this.mpesaService.getTransactionStatus(user.shopId, id);
  }

  /**
   * RETRY FAILED PAYMENT
   *
   * Retries a failed M-Pesa payment with optional new phone number.
   *
   * @param user - Authenticated user
   * @param id - Transaction ID to retry
   * @param dto - Retry data (optional new phone number)
   * @returns New payment response
   */
  @UseGuards(JwtAuthGuard)
  @Post('retry/:id')
  @HttpCode(HttpStatus.OK)
  async retryPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { newPhoneNumber?: string },
  ): Promise<MpesaPaymentResponseDto> {
    this.logger.log(`Retrying M-Pesa payment ${id} by user ${user.sub}`);

    return this.mpesaService.retryPayment(
      user.shopId,
      user.sub,
      user.name || user.email || 'Cashier',
      id,
      dto.newPhoneNumber,
    );
  }

  /**
   * CANCEL PENDING PAYMENT
   *
   * Cancels a pending M-Pesa payment request.
   *
   * @param user - Authenticated user
   * @param id - Transaction ID to cancel
   */
  @UseGuards(JwtAuthGuard)
  @Post('cancel/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    this.logger.log(`Cancelling M-Pesa payment ${id} by user ${user.sub}`);
    await this.mpesaService.cancelPayment(user.shopId, id);
  }

  /**
   * LIST PENDING TRANSACTIONS
   *
   * Returns all pending M-Pesa transactions for the shop.
   * Useful for admin dashboard and reconciliation.
   *
   * @param user - Authenticated user
   * @param limit - Maximum number of results
   * @param skip - Number of results to skip
   */
  @UseGuards(JwtAuthGuard)
  @Get('pending')
  async listPendingTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const transactions = await this.mpesaService.listPendingTransactions(
      user.shopId,
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );

    return {
      transactions,
      count: transactions.length,
    };
  }

  /**
   * QUERY M-PESA STATUS (FALLBACK)
   *
   * Manually queries M-Pesa for transaction status.
   * Used when callback was missed or for reconciliation.
   *
   * @param user - Authenticated user
   * @param id - Transaction ID to query
   */
  @UseGuards(JwtAuthGuard)
  @Post('query/:id')
  @HttpCode(HttpStatus.OK)
  async queryMpesaStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<MpesaStatusResponseDto> {
    this.logger.log(`Querying M-Pesa status for transaction ${id}`);

    // First query M-Pesa
    await this.mpesaService.queryMpesaStatus(user.shopId, id);

    // Then return updated status
    return this.mpesaService.getTransactionStatus(user.shopId, id);
  }

  // ============================================
  // MULTI-TENANT M-PESA CONFIGURATION ENDPOINTS
  // ============================================

  /**
   * GET SHOP M-PESA CONFIGURATION
   * 
   * Returns the current M-Pesa configuration for the shop.
   * Sensitive fields (keys, secrets) are masked.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('config')
  async getMpesaConfig(@CurrentUser() user: JwtPayload) {
    const config = await this.mpesaMultiTenantService.getShopMpesaConfig(user.shopId);
    
    // Mask sensitive fields
    return {
      type: config.type,
      shortCode: config.shortCode,
      accountPrefix: config.accountPrefix,
      callbackUrl: config.callbackUrl,
      isShopSpecific: config.isShopSpecific,
      hasCredentials: !!(config.consumerKey && config.consumerSecret && config.passkey),
      // Don't expose actual keys
      consumerKey: config.consumerKey ? '****' + config.consumerKey.slice(-4) : null,
    };
  }

  /**
   * UPDATE SHOP M-PESA CONFIGURATION
   * 
   * Allows shop admin to configure their own M-Pesa credentials.
   * This enables each shop to use their own Paybill/Till number.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('config')
  async updateMpesaConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMpesaConfigDto,
  ) {
    this.logger.log(`Updating M-Pesa config for shop ${user.shopId}`);
    
    const updated = await this.mpesaMultiTenantService.updateShopMpesaConfig(user.shopId, dto);
    
    return {
      success: true,
      message: 'M-Pesa configuration updated. Please verify credentials.',
      config: {
        type: updated?.mpesaConfig?.type,
        shortCode: updated?.mpesaConfig?.shortCode,
        enabled: updated?.mpesaConfig?.enabled,
        verificationStatus: updated?.mpesaConfig?.verificationStatus,
      },
    };
  }

  /**
   * VERIFY SHOP M-PESA CREDENTIALS
   * 
   * Tests the shop's M-Pesa credentials by attempting to get an access token.
   * This confirms the credentials are valid before enabling payments.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('config/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMpesaCredentials(@CurrentUser() user: JwtPayload) {
    this.logger.log(`Verifying M-Pesa credentials for shop ${user.shopId}`);
    
    return this.mpesaMultiTenantService.verifyShopMpesaCredentials(user.shopId);
  }

  /**
   * INITIATE PAYMENT WITH SHOP-SPECIFIC CREDENTIALS
   * 
   * Uses the shop's own M-Pesa credentials if configured,
   * otherwise falls back to platform credentials.
   */
  @UseGuards(JwtAuthGuard)
  @Post('initiate-v2')
  @HttpCode(HttpStatus.OK)
  async initiatePaymentV2(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { phoneNumber: string; amount: number; orderId: string; orderNumber: string; description?: string },
  ) {
    this.logger.log(`Initiating multi-tenant M-Pesa payment for shop ${user.shopId}`);
    
    return this.mpesaMultiTenantService.initiateSTKPush({
      shopId: user.shopId,
      phoneNumber: dto.phoneNumber,
      amount: dto.amount,
      orderId: dto.orderId,
      orderNumber: dto.orderNumber,
      description: dto.description,
    });
  }

  /**
   * MULTI-TENANT CALLBACK
   * 
   * Handles callbacks for all shops. Routes to correct shop based on transaction.
   */
  @Post('callback-v2')
  @HttpCode(HttpStatus.OK)
  async handleCallbackV2(@Body() payload: any) {
    this.logger.log('Received multi-tenant M-Pesa callback');
    
    const result = await this.mpesaMultiTenantService.handleCallback(payload);
    
    return { ResultCode: 0, ResultDesc: 'Callback processed' };
  }
}
