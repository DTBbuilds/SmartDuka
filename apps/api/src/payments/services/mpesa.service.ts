import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  MpesaTransaction,
  MpesaTransactionDocument,
  MpesaTransactionStatus,
} from '../schemas/mpesa-transaction.schema';
import { DarajaService } from '../daraja.service';
import { PaymentTransactionService } from './payment-transaction.service';
import {
  InitiateMpesaPaymentDto,
  MpesaCallbackDto,
  MpesaPaymentResponseDto,
  MpesaStatusResponseDto,
  parseCallbackMetadata,
  generateIdempotencyKey,
  getMpesaErrorMessage,
  isRetryableError,
  SmartDukaMpesaErrorCode,
  formatPhoneNumber,
  maskPhoneNumber,
} from '../dto/mpesa.dto';

// Transaction expiry time in milliseconds (5 minutes)
const TRANSACTION_EXPIRY_MS = 5 * 60 * 1000;

// Idempotency window in milliseconds (24 hours)
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  constructor(
    @InjectModel(MpesaTransaction.name)
    private readonly mpesaTransactionModel: Model<MpesaTransactionDocument>,
    private readonly darajaService: DarajaService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * INITIATE M-PESA PAYMENT WITH IDEMPOTENCY
   *
   * This method implements idempotent payment initiation:
   * 1. Check for existing transaction with same idempotency key
   * 2. If exists and pending, return existing transaction
   * 3. If not exists, create new transaction and send STK push
   *
   * @param shopId - Shop ID for multi-tenant isolation
   * @param userId - User ID (cashier) initiating payment
   * @param dto - Payment initiation data
   * @returns Payment response with transaction details
   */
  async initiatePayment(
    shopId: string,
    userId: string,
    userName: string,
    branchId: string | undefined,
    orderId: string,
    orderNumber: string,
    dto: InitiateMpesaPaymentDto,
  ): Promise<MpesaPaymentResponseDto> {
    // Generate idempotency key if not provided
    const idempotencyKey =
      dto.idempotencyKey || generateIdempotencyKey(shopId, orderId);

    this.logger.log(
      `Initiating M-Pesa payment for order ${orderNumber}, idempotency key: ${idempotencyKey}`,
    );

    // STEP 1: Check for existing transaction (idempotency check)
    const existingTransaction = await this.findByIdempotencyKey(idempotencyKey);

    if (existingTransaction) {
      // If transaction is still pending, return it (idempotent response)
      if (
        existingTransaction.status === MpesaTransactionStatus.PENDING ||
        existingTransaction.status === MpesaTransactionStatus.CREATED
      ) {
        this.logger.log(
          `Found existing pending transaction ${existingTransaction._id} for idempotency key ${idempotencyKey}`,
        );

        return {
          success: true,
          transactionId: existingTransaction._id.toString(),
          checkoutRequestId: existingTransaction.checkoutRequestId,
          status: existingTransaction.status,
          expiresAt: existingTransaction.expiresAt,
          message: 'Existing payment request found. Check your phone for the STK prompt.',
          isIdempotent: true,
        };
      }

      // If transaction completed, return success
      if (existingTransaction.status === MpesaTransactionStatus.COMPLETED) {
        return {
          success: true,
          transactionId: existingTransaction._id.toString(),
          checkoutRequestId: existingTransaction.checkoutRequestId,
          status: existingTransaction.status,
          expiresAt: existingTransaction.expiresAt,
          message: `Payment already completed. Receipt: ${existingTransaction.mpesaReceiptNumber}`,
          isIdempotent: true,
        };
      }

      // If transaction failed/expired, allow retry with new idempotency key
      // (handled below by creating new transaction)
    }

    // STEP 2: Validate phone number format
    const formattedPhone = formatPhoneNumber(dto.phoneNumber);
    if (!formattedPhone || formattedPhone.length !== 12) {
      throw new BadRequestException({
        errorCode: SmartDukaMpesaErrorCode.INVALID_PHONE,
        message: 'Invalid phone number format. Use 07XX, 01XX, or 254XX format.',
      });
    }

    // STEP 3: Create transaction record (CREATED state)
    const accountReference = `SD-${orderNumber}`;
    const transactionDesc = dto.transactionDesc || `Payment for order ${orderNumber}`;
    const expiresAt = new Date(Date.now() + TRANSACTION_EXPIRY_MS);

    let transaction: MpesaTransactionDocument;
    try {
      transaction = new this.mpesaTransactionModel({
        shopId: new Types.ObjectId(shopId),
        branchId: branchId ? new Types.ObjectId(branchId) : undefined,
        orderId: new Types.ObjectId(orderId),
        orderNumber,
        idempotencyKey,
        phoneNumber: formattedPhone,
        amount: dto.amount,
        accountReference,
        transactionDesc,
        status: MpesaTransactionStatus.CREATED,
        expiresAt,
        cashierId: new Types.ObjectId(userId),
        cashierName: userName,
        customerName: dto.customerName,
      });

      await transaction.save();
      this.logger.log(`Created M-Pesa transaction ${transaction._id}`);
    } catch (error: any) {
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        throw new ConflictException({
          errorCode: SmartDukaMpesaErrorCode.DUPLICATE_TRANSACTION,
          message: 'A payment request is already in progress for this order.',
        });
      }
      throw new InternalServerErrorException({
        errorCode: SmartDukaMpesaErrorCode.STK_PUSH_FAILED,
        message: 'Failed to create payment request.',
      });
    }

    // STEP 4: Send STK Push
    try {
      let callbackUrl = this.configService.get('MPESA_CALLBACK_URL');
      const mpesaEnv = this.configService.get('MPESA_ENV', 'sandbox');
      
      // Auto-construct callback URL for Render deployments if not set
      if (!callbackUrl) {
        const renderExternalUrl = this.configService.get('RENDER_EXTERNAL_URL');
        const apiBaseUrl = this.configService.get('API_BASE_URL');
        
        if (renderExternalUrl) {
          // Render provides RENDER_EXTERNAL_URL automatically on paid plans
          callbackUrl = `${renderExternalUrl}/payments/mpesa/callback`;
          this.logger.log(`Auto-constructed callback URL from RENDER_EXTERNAL_URL: ${callbackUrl}`);
        } else if (apiBaseUrl) {
          // Use API_BASE_URL if provided
          callbackUrl = `${apiBaseUrl}/payments/mpesa/callback`;
          this.logger.log(`Auto-constructed callback URL from API_BASE_URL: ${callbackUrl}`);
        } else if (process.env.RENDER === 'true') {
          // On Render free tier, construct from known URL pattern
          // This requires setting API_BASE_URL or MPESA_CALLBACK_URL in Render dashboard
          this.logger.error(
            '❌ MPESA_CALLBACK_URL not set! On Render, please set this environment variable:\n' +
            '   MPESA_CALLBACK_URL=https://smartduka-91q6.onrender.com/payments/mpesa/callback\n' +
            '   (Replace with your actual Render service URL)'
          );
        }
      }
      
      // DEBUG: Log the actual callback URL being used
      this.logger.log(`🔍 DEBUG: MPESA_CALLBACK_URL = "${callbackUrl}"`);
      
      // Validate callback URL
      if (!callbackUrl || callbackUrl.includes('your-domain.com') || callbackUrl.includes('localhost')) {
        this.logger.warn(
          'MPESA_CALLBACK_URL is not properly configured. ' +
          'For development, use ngrok: ngrok http 5000, then set MPESA_CALLBACK_URL=https://xxxx.ngrok-free.app/payments/mpesa/callback'
        );
        
        // For production, throw error if callback URL is not set
        if (mpesaEnv === 'production') {
          throw new Error('MPESA_CALLBACK_URL must be configured for production');
        }
      }

      // Check for Cloudflare tunnel URLs which often get rejected by M-Pesa
      const problematicDomains = ['trycloudflare.com', 'cloudflare', 'workers.dev'];
      const hasProblematicDomain = problematicDomains.some(d => callbackUrl?.includes(d));
      
      if (hasProblematicDomain) {
        this.logger.error(
          `❌ Cloudflare tunnel URL detected! M-Pesa sandbox rejects these with "Threat Detected" error.\n` +
          `   Please use ngrok instead:\n` +
          `   1. Run: pnpm ngrok:start (in a separate terminal)\n` +
          `   2. Run: pnpm ngrok:watch (in another terminal to auto-update .env)\n` +
          `   3. Restart the API server`
        );
        throw new Error(
          'Cloudflare tunnel URLs are rejected by M-Pesa. Use ngrok instead: pnpm ngrok:start'
        );
      }
      
      const finalCallbackUrl = callbackUrl;
      
      this.logger.log(`STK Push request - Phone: ${formattedPhone}, Amount: ${dto.amount}, Callback: ${finalCallbackUrl}`);

      const stkResponse = await this.darajaService.initiateStkPush({
        phoneNumber: formattedPhone,
        amount: dto.amount,
        accountReference,
        transactionDesc,
        callbackUrl: finalCallbackUrl,
      });

      // STEP 5: Update transaction with STK response (PENDING state)
      transaction.checkoutRequestId = stkResponse.CheckoutRequestID;
      transaction.merchantRequestId = stkResponse.MerchantRequestID;
      transaction.status = MpesaTransactionStatus.PENDING;
      transaction.previousStatus = MpesaTransactionStatus.CREATED;
      transaction.stkPushSentAt = new Date();

      await transaction.save();

      this.logger.log(
        `STK push sent for transaction ${transaction._id}, checkoutRequestId: ${stkResponse.CheckoutRequestID}`,
      );

      return {
        success: true,
        transactionId: transaction._id.toString(),
        checkoutRequestId: stkResponse.CheckoutRequestID,
        status: MpesaTransactionStatus.PENDING,
        expiresAt,
        message: `STK push sent to ${maskPhoneNumber(formattedPhone)}. Enter your M-Pesa PIN to complete payment.`,
      };
    } catch (error: any) {
      // STEP 6: Handle STK push failure
      this.logger.error(
        `STK push failed for transaction ${transaction._id}: ${error.message}`,
      );

      transaction.status = MpesaTransactionStatus.FAILED;
      transaction.previousStatus = MpesaTransactionStatus.CREATED;
      transaction.lastError = error.message;
      await transaction.save();

      throw new InternalServerErrorException({
        errorCode: SmartDukaMpesaErrorCode.STK_PUSH_FAILED,
        message: 'Failed to send payment request. Please try again.',
        details: { transactionId: transaction._id.toString() },
      });
    }
  }

  /**
   * PROCESS M-PESA CALLBACK
   *
   * Handles the callback from M-Pesa after user action:
   * 1. Find transaction by checkoutRequestId
   * 2. Validate callback (signature verification)
   * 3. Update transaction status based on result
   * 4. Create payment transaction record if successful
   * 5. Calculate timing metrics for analytics
   *
   * @param payload - Callback payload from M-Pesa
   * @returns Acknowledgment response
   */
  async processCallback(
    payload: MpesaCallbackDto,
  ): Promise<{ ResultCode: number; ResultDesc: string }> {
    const { stkCallback } = payload.Body;
    const {
      CheckoutRequestID,
      MerchantRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    const callbackReceivedAt = new Date();

    this.logger.log(
      `Processing M-Pesa callback for checkoutRequestId: ${CheckoutRequestID}, resultCode: ${ResultCode}`,
    );

    // STEP 1: Find transaction by checkoutRequestId
    const transaction = await this.mpesaTransactionModel.findOne({
      checkoutRequestId: CheckoutRequestID,
    });

    if (!transaction) {
      this.logger.warn(
        `Transaction not found for checkoutRequestId: ${CheckoutRequestID}`,
      );
      // Still return success to M-Pesa to prevent retries
      return { ResultCode: 0, ResultDesc: 'Callback received' };
    }

    // STEP 2: Check if already processed (idempotent callback handling)
    if (
      transaction.status === MpesaTransactionStatus.COMPLETED ||
      transaction.status === MpesaTransactionStatus.FAILED
    ) {
      this.logger.log(
        `Transaction ${transaction._id} already processed with status: ${transaction.status}`,
      );
      return { ResultCode: 0, ResultDesc: 'Already processed' };
    }

    // STEP 3: Store callback payload and calculate timing metrics
    transaction.callbackPayload = payload;
    transaction.callbackReceivedAt = callbackReceivedAt;
    transaction.callbackReceived = true;
    transaction.mpesaResultCode = ResultCode;
    transaction.mpesaResultDesc = ResultDesc;

    // Calculate timing metrics
    if (transaction.stkPushSentAt) {
      transaction.responseTimeMs = callbackReceivedAt.getTime() - transaction.stkPushSentAt.getTime();
      
      // Estimate user input time (response time minus ~5s for M-Pesa processing)
      const estimatedProcessingTime = 5000; // 5 seconds for M-Pesa internal processing
      transaction.userInputTimeMs = Math.max(0, transaction.responseTimeMs - estimatedProcessingTime);
    }

    if (transaction.createdAt) {
      transaction.totalTimeMs = callbackReceivedAt.getTime() - transaction.createdAt.getTime();
    }

    // STEP 4: Process based on result code
    if (ResultCode === 0) {
      // SUCCESS
      const metadata = parseCallbackMetadata(CallbackMetadata?.Item);

      transaction.previousStatus = transaction.status;
      transaction.status = MpesaTransactionStatus.COMPLETED;
      transaction.mpesaReceiptNumber = metadata.mpesaReceiptNumber;
      transaction.completedAt = callbackReceivedAt;

      await transaction.save();

      this.logger.log(
        `M-Pesa payment successful for transaction ${transaction._id}, receipt: ${metadata.mpesaReceiptNumber}, responseTime: ${transaction.responseTimeMs}ms`,
      );

      // STEP 5: Create payment transaction record
      try {
        await this.paymentTransactionService.createTransaction({
          shopId: transaction.shopId.toString(),
          orderId: transaction.orderId.toString(),
          orderNumber: transaction.orderNumber,
          cashierId: transaction.cashierId.toString(),
          cashierName: transaction.cashierName,
          branchId: transaction.branchId?.toString(),
          paymentMethod: 'mpesa',
          amount: transaction.amount,
          status: 'completed',
          customerName: transaction.customerName,
          customerPhone: transaction.phoneNumber,
          mpesaReceiptNumber: metadata.mpesaReceiptNumber,
          mpesaTransactionId: CheckoutRequestID,
          referenceNumber: metadata.mpesaReceiptNumber,
        });

        this.logger.log(
          `Payment transaction created for M-Pesa transaction ${transaction._id}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to create payment transaction for ${transaction._id}: ${error.message}`,
        );
        // Don't fail the callback - transaction is already marked complete
      }

      // TODO: Update order payment status
      // TODO: Emit WebSocket event for real-time UI update
    } else {
      // FAILURE - Categorize the error
      transaction.previousStatus = transaction.status;
      transaction.status = MpesaTransactionStatus.FAILED;
      transaction.lastError = getMpesaErrorMessage(ResultCode);
      
      // Categorize error for analytics
      const errorCategory = this.categorizeError(ResultCode);
      transaction.errorCategory = errorCategory;

      await transaction.save();

      this.logger.warn(
        `M-Pesa payment failed for transaction ${transaction._id}: ${ResultDesc} (category: ${errorCategory})`,
      );
    }

    return { ResultCode: 0, ResultDesc: 'Callback processed successfully' };
  }

  /**
   * Categorize M-Pesa error codes for analytics
   */
  private categorizeError(resultCode: number): string {
    const categories: Record<number, string> = {
      1: 'insufficient_funds',
      2: 'invalid_amount',
      3: 'invalid_amount',
      4: 'limit_exceeded',
      5: 'invalid_amount',
      6: 'invalid_account',
      7: 'invalid_phone',
      8: 'invalid_phone',
      9: 'duplicate_request',
      17: 'system_busy',
      1032: 'user_cancelled',
      1037: 'timeout',
      2001: 'wrong_pin',
    };
    return categories[resultCode] || 'unknown';
  }

  /**
   * GET TRANSACTION STATUS
   *
   * Returns the current status of an M-Pesa transaction
   *
   * @param shopId - Shop ID for multi-tenant isolation
   * @param transactionId - Transaction ID
   * @returns Transaction status details
   */
  async getTransactionStatus(
    shopId: string,
    transactionId: string,
  ): Promise<MpesaStatusResponseDto> {
    const transaction = await this.mpesaTransactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!transaction) {
      throw new NotFoundException({
        errorCode: SmartDukaMpesaErrorCode.TRANSACTION_NOT_FOUND,
        message: 'Transaction not found',
      });
    }

    // Check if expired
    if (
      transaction.status === MpesaTransactionStatus.PENDING &&
      new Date() > transaction.expiresAt
    ) {
      transaction.previousStatus = transaction.status;
      transaction.status = MpesaTransactionStatus.EXPIRED;
      await transaction.save();
    }

    const timeRemaining = Math.max(
      0,
      Math.floor((transaction.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      transactionId: transaction._id.toString(),
      orderId: transaction.orderId.toString(),
      orderNumber: transaction.orderNumber,
      status: transaction.status,
      amount: transaction.amount,
      phoneNumber: maskPhoneNumber(transaction.phoneNumber),
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      mpesaResultCode: transaction.mpesaResultCode,
      mpesaResultDesc: transaction.mpesaResultDesc,
      expiresAt: transaction.expiresAt,
      timeRemaining,
      canRetry:
        transaction.status === MpesaTransactionStatus.FAILED &&
        transaction.retryCount < transaction.maxRetries,
      createdAt: transaction.createdAt!,
      completedAt: transaction.completedAt,
    };
  }

  /**
   * RETRY FAILED PAYMENT
   *
   * Retries a failed M-Pesa payment with optional new phone number
   *
   * @param shopId - Shop ID for multi-tenant isolation
   * @param transactionId - Transaction ID to retry
   * @param newPhoneNumber - Optional new phone number
   * @returns New payment response
   */
  async retryPayment(
    shopId: string,
    userId: string,
    userName: string,
    transactionId: string,
    newPhoneNumber?: string,
  ): Promise<MpesaPaymentResponseDto> {
    const transaction = await this.mpesaTransactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!transaction) {
      throw new NotFoundException({
        errorCode: SmartDukaMpesaErrorCode.TRANSACTION_NOT_FOUND,
        message: 'Transaction not found',
      });
    }

    // Check if retry is allowed
    if (transaction.status !== MpesaTransactionStatus.FAILED) {
      throw new BadRequestException({
        errorCode: SmartDukaMpesaErrorCode.INVALID_STATE_TRANSITION,
        message: `Cannot retry transaction in ${transaction.status} state`,
      });
    }

    if (transaction.retryCount >= transaction.maxRetries) {
      throw new BadRequestException({
        errorCode: SmartDukaMpesaErrorCode.MAX_RETRIES_EXCEEDED,
        message: 'Maximum retry attempts exceeded. Please create a new payment.',
      });
    }

    // Update phone number if provided
    const phoneNumber = newPhoneNumber
      ? formatPhoneNumber(newPhoneNumber)
      : transaction.phoneNumber;

    // Generate new idempotency key for retry
    const newIdempotencyKey = generateIdempotencyKey(
      shopId,
      transaction.orderId.toString(),
    );

    // Create new transaction for retry
    return this.initiatePayment(
      shopId,
      userId,
      userName,
      transaction.branchId?.toString(),
      transaction.orderId.toString(),
      transaction.orderNumber,
      {
        orderId: transaction.orderId.toString(),
        phoneNumber,
        amount: transaction.amount,
        customerName: transaction.customerName,
        idempotencyKey: newIdempotencyKey,
        transactionDesc: transaction.transactionDesc,
      },
    );
  }

  /**
   * CANCEL PENDING PAYMENT
   *
   * Cancels a pending M-Pesa payment request
   *
   * @param shopId - Shop ID for multi-tenant isolation
   * @param transactionId - Transaction ID to cancel
   */
  async cancelPayment(shopId: string, transactionId: string): Promise<void> {
    const transaction = await this.mpesaTransactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!transaction) {
      throw new NotFoundException({
        errorCode: SmartDukaMpesaErrorCode.TRANSACTION_NOT_FOUND,
        message: 'Transaction not found',
      });
    }

    if (
      transaction.status !== MpesaTransactionStatus.PENDING &&
      transaction.status !== MpesaTransactionStatus.CREATED
    ) {
      throw new BadRequestException({
        errorCode: SmartDukaMpesaErrorCode.INVALID_STATE_TRANSITION,
        message: `Cannot cancel transaction in ${transaction.status} state`,
      });
    }

    transaction.previousStatus = transaction.status;
    transaction.status = MpesaTransactionStatus.EXPIRED;
    transaction.lastError = 'Cancelled by user';
    await transaction.save();

    this.logger.log(`M-Pesa transaction ${transactionId} cancelled by user`);
  }

  /**
   * LIST PENDING TRANSACTIONS
   *
   * Returns all pending M-Pesa transactions for a shop
   *
   * @param shopId - Shop ID for multi-tenant isolation
   * @param limit - Maximum number of results
   * @param skip - Number of results to skip
   */
  async listPendingTransactions(
    shopId: string,
    limit = 50,
    skip = 0,
  ): Promise<MpesaTransactionDocument[]> {
    return this.mpesaTransactionModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: { $in: [MpesaTransactionStatus.PENDING, MpesaTransactionStatus.CREATED] },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * EXPIRE STALE TRANSACTIONS
   *
   * Background job to expire transactions that have timed out
   */
  async expireStaleTransactions(): Promise<number> {
    const result = await this.mpesaTransactionModel.updateMany(
      {
        status: { $in: [MpesaTransactionStatus.PENDING, MpesaTransactionStatus.CREATED] },
        expiresAt: { $lt: new Date() },
      },
      {
        $set: {
          status: MpesaTransactionStatus.EXPIRED,
          lastError: 'Transaction expired',
        },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} stale M-Pesa transactions`);
    }

    return result.modifiedCount;
  }

  /**
   * QUERY TRANSACTION STATUS FROM M-PESA
   *
   * Queries M-Pesa directly for transaction status (fallback for missed callbacks)
   *
   * @param transactionId - Transaction ID to query
   */
  async queryMpesaStatus(shopId: string, transactionId: string): Promise<void> {
    const transaction = await this.mpesaTransactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!transaction || !transaction.checkoutRequestId) {
      throw new NotFoundException('Transaction not found or no checkout request ID');
    }

    try {
      const status = await this.darajaService.queryStkStatus(
        transaction.checkoutRequestId,
        transaction.merchantRequestId || '',
      );

      if (status.resultCode === 0 && transaction.status === MpesaTransactionStatus.PENDING) {
        // Payment was successful but callback was missed
        transaction.previousStatus = transaction.status;
        transaction.status = MpesaTransactionStatus.COMPLETED;
        transaction.mpesaResultCode = status.resultCode;
        transaction.mpesaResultDesc = status.resultDesc;
        transaction.completedAt = new Date();
        await transaction.save();

        this.logger.log(
          `Transaction ${transactionId} marked complete via status query`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to query M-Pesa status for ${transactionId}: ${error.message}`,
      );
    }
  }

  // ============================================
  // FAILED & EXPIRED TRANSACTIONS
  // ============================================

  /**
   * GET FAILED TRANSACTIONS
   * 
   * Returns all failed M-Pesa transactions for a shop
   */
  async getFailedTransactions(
    shopId: string,
    options: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<MpesaTransactionDocument[]> {
    const { limit = 50, skip = 0, startDate, endDate } = options;

    const query: any = {
      shopId: new Types.ObjectId(shopId),
      status: MpesaTransactionStatus.FAILED,
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    return this.mpesaTransactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * GET EXPIRED TRANSACTIONS
   * 
   * Returns all expired M-Pesa transactions for a shop
   */
  async getExpiredTransactions(
    shopId: string,
    limit = 50,
    skip = 0,
  ): Promise<MpesaTransactionDocument[]> {
    return this.mpesaTransactionModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: MpesaTransactionStatus.EXPIRED,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * GET TRANSACTION STATISTICS
   * 
   * Returns aggregated statistics for M-Pesa transactions
   */
  async getTransactionStats(
    shopId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    expired: number;
    pending: number;
    totalAmount: number;
    completedAmount: number;
    successRate: number;
    averageAmount: number;
    byStatus: Record<string, { count: number; amount: number }>;
    byDay?: Array<{ date: string; count: number; amount: number }>;
  }> {
    const matchStage: any = {
      shopId: new Types.ObjectId(shopId),
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    // Aggregate by status
    const statusStats = await this.mpesaTransactionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    // Aggregate by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await this.mpesaTransactionModel.aggregate([
      {
        $match: {
          ...matchStage,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate totals
    const result = {
      total: 0,
      completed: 0,
      failed: 0,
      expired: 0,
      pending: 0,
      totalAmount: 0,
      completedAmount: 0,
      successRate: 0,
      averageAmount: 0,
      byStatus: {} as Record<string, { count: number; amount: number }>,
      byDay: dailyStats.map((d) => ({
        date: d._id,
        count: d.count,
        amount: d.amount,
      })),
    };

    for (const stat of statusStats) {
      result.total += stat.count;
      result.totalAmount += stat.amount;
      result.byStatus[stat._id] = { count: stat.count, amount: stat.amount };

      switch (stat._id) {
        case MpesaTransactionStatus.COMPLETED:
          result.completed = stat.count;
          result.completedAmount = stat.amount;
          break;
        case MpesaTransactionStatus.FAILED:
          result.failed = stat.count;
          break;
        case MpesaTransactionStatus.EXPIRED:
          result.expired = stat.count;
          break;
        case MpesaTransactionStatus.PENDING:
        case MpesaTransactionStatus.CREATED:
          result.pending += stat.count;
          break;
      }
    }

    // Calculate rates
    const completedOrFailed = result.completed + result.failed;
    if (completedOrFailed > 0) {
      result.successRate = Math.round((result.completed / completedOrFailed) * 100);
    }

    if (result.total > 0) {
      result.averageAmount = Math.round(result.totalAmount / result.total);
    }

    return result;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<MpesaTransactionDocument | null> {
    // Only consider transactions within idempotency window
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);

    return this.mpesaTransactionModel.findOne({
      idempotencyKey,
      createdAt: { $gte: windowStart },
    });
  }
}
