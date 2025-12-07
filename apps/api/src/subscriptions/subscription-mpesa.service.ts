import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceDocument,
} from './schemas/subscription-invoice.schema';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './schemas/subscription.schema';

/**
 * SmartDuka Subscription M-Pesa Payment Service
 * 
 * This service handles M-Pesa payments for subscription invoices.
 * Uses the SYSTEM PAYBILL configuration (from environment variables)
 * for all subscription payments - NOT shop-specific configs.
 * 
 * Payment Methods:
 * 1. STK Push - Initiates payment prompt on customer's phone
 * 2. Manual Payment - Customer sends money directly, then confirms
 */

export interface StkPushResult {
  success: boolean;
  message: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  transactionId?: string;
  error?: string;
}

export interface PaymentConfirmation {
  success: boolean;
  message: string;
  mpesaReceiptNumber?: string;
  transactionDate?: Date;
  amount?: number;
}

// Import axios for direct M-Pesa API calls
import axios from 'axios';

@Injectable()
export class SubscriptionMpesaService {
  private readonly logger = new Logger(SubscriptionMpesaService.name);
  
  // SmartDuka payment receiving number (for manual payments)
  private readonly SMARTDUKA_PHONE = '254729983567';
  
  // System M-Pesa API configuration (from environment variables)
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly passKey: string;
  private readonly shortCode: string;
  private readonly environment: 'sandbox' | 'production';
  private readonly callbackUrl: string;
  
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(
    @InjectModel(SubscriptionInvoice.name)
    private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly configService: ConfigService,
  ) {
    // Load SYSTEM M-Pesa configuration from environment
    this.consumerKey = this.configService.get('MPESA_CONSUMER_KEY', '');
    this.consumerSecret = this.configService.get('MPESA_CONSUMER_SECRET', '');
    this.passKey = this.configService.get('MPESA_PASSKEY', '');
    this.shortCode = this.configService.get('MPESA_SHORTCODE', '174379');
    this.environment = this.configService.get('MPESA_ENV', 'sandbox') as any;
    this.callbackUrl = this.configService.get('MPESA_CALLBACK_URL', '');
    
    // Log configuration status on startup
    this.logger.log(`Subscription M-Pesa Service initialized:`);
    this.logger.log(`  - Environment: ${this.environment}`);
    this.logger.log(`  - ShortCode: ${this.shortCode}`);
    this.logger.log(`  - Consumer Key: ${this.consumerKey ? this.consumerKey.substring(0, 10) + '...' : 'NOT SET'}`);
    this.logger.log(`  - Callback URL: ${this.callbackUrl || 'NOT SET'}`);
    
    if (!this.consumerKey || !this.consumerSecret) {
      this.logger.error('❌ M-Pesa credentials not configured! STK Push will fail.');
    }
    
    // Check for problematic callback URLs
    if (this.callbackUrl && this.callbackUrl.includes('trycloudflare.com')) {
      this.logger.warn('⚠️ Cloudflare tunnel URL detected - M-Pesa sandbox may reject this!');
      this.logger.warn('   Use ngrok instead: pnpm ngrok:start');
    }
  }

  private getBaseUrl(): string {
    return this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get M-Pesa OAuth access token using SYSTEM credentials
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.consumerKey || !this.consumerSecret) {
      throw new BadRequestException(
        'M-Pesa is not configured. Please contact support to set up payment processing.'
      );
    }

    try {
      const auth = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`,
      ).toString('base64');

      this.logger.debug(`Getting M-Pesa access token from ${this.getBaseUrl()}`);

      const response = await axios.get(
        `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 30000,
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + 3500 * 1000;

      this.logger.log('✅ M-Pesa access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      this.logger.error('❌ Failed to get M-Pesa access token:', error.response?.data || error.message);
      throw new BadRequestException('Failed to connect to M-Pesa. Please try again later.');
    }
  }

  /**
   * Format phone number to 254XXXXXXXXX format
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }

  /**
   * Generate M-Pesa password
   */
  private generatePassword(timestamp: string): string {
    const data = this.shortCode + this.passKey + timestamp;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Get current timestamp in M-Pesa format
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
  }

  /**
   * Get a valid callback URL for subscription payments
   * Uses dedicated subscription callback endpoint
   */
  private getSubscriptionCallbackUrl(): string {
    let baseUrl = this.callbackUrl;
    
    // If callback URL contains the full path, extract just the base
    if (baseUrl.includes('/payments/mpesa/callback')) {
      baseUrl = baseUrl.replace('/payments/mpesa/callback', '');
    }
    
    // Use dedicated subscription callback endpoint
    const callbackUrl = `${baseUrl}/subscriptions/payments/mpesa/callback`;
    
    this.logger.debug(`Subscription callback URL: ${callbackUrl}`);
    return callbackUrl;
  }

  /**
   * Initiate STK Push for subscription payment
   * Uses SYSTEM PAYBILL configuration
   * 
   * @param invoiceId - Invoice to pay
   * @param phoneNumber - Customer's phone number
   * @param shopId - Shop making the payment
   */
  async initiateSubscriptionPayment(
    invoiceId: string,
    phoneNumber: string,
    shopId: string,
  ): Promise<StkPushResult> {
    try {
      this.logger.log(`=== INITIATING SUBSCRIPTION PAYMENT ===`);
      this.logger.log(`Invoice ID: ${invoiceId}`);
      this.logger.log(`Phone: ${phoneNumber}`);
      this.logger.log(`Shop ID: ${shopId}`);

      // Get invoice details
      const invoice = await this.invoiceModel.findOne({
        _id: new Types.ObjectId(invoiceId),
        shopId: new Types.ObjectId(shopId),
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found: ${invoiceId}`);
        return {
          success: false,
          message: 'Invoice not found',
          error: 'INVOICE_NOT_FOUND',
        };
      }

      if (invoice.status === 'paid') {
        return {
          success: false,
          message: 'Invoice is already paid',
          error: 'ALREADY_PAID',
        };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      this.logger.log(`Formatted phone: ${formattedPhone}`);
      
      // Validate phone number
      if (!/^254[71]\d{8}$/.test(formattedPhone)) {
        return {
          success: false,
          message: 'Invalid phone number. Please use a valid Safaricom number (07XX or 01XX).',
          error: 'INVALID_PHONE',
        };
      }

      // Get access token using SYSTEM credentials
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);
      const callbackUrl = this.getSubscriptionCallbackUrl();

      // Sanitize account reference (max 12 chars, alphanumeric)
      const accountRef = `SD${invoice.invoiceNumber}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      
      // Sanitize description (max 13 chars)
      const description = 'Subscription'.slice(0, 13);

      // STK Push request using SYSTEM PAYBILL
      const stkRequest = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(invoice.totalAmount),
        PartyA: formattedPhone,
        PartyB: this.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountRef,
        TransactionDesc: description,
      };

      this.logger.log(`STK Push Request:`);
      this.logger.log(`  - ShortCode: ${this.shortCode}`);
      this.logger.log(`  - Amount: KES ${invoice.totalAmount}`);
      this.logger.log(`  - Phone: ${formattedPhone}`);
      this.logger.log(`  - AccountRef: ${accountRef}`);
      this.logger.log(`  - CallbackURL: ${callbackUrl}`);

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        stkRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      this.logger.log(`STK Push Response: ${JSON.stringify(response.data)}`);

      if (response.data.ResponseCode === '0') {
        // Update invoice with payment attempt
        await this.invoiceModel.updateOne(
          { _id: invoice._id },
          {
            $set: {
              'paymentAttempt': {
                checkoutRequestId: response.data.CheckoutRequestID,
                merchantRequestId: response.data.MerchantRequestID,
                phoneNumber: formattedPhone,
                initiatedAt: new Date(),
              },
            },
          },
        );

        this.logger.log(`✅ STK Push sent successfully! CheckoutRequestID: ${response.data.CheckoutRequestID}`);

        return {
          success: true,
          message: `Payment request sent to ${phoneNumber}. Please enter your M-Pesa PIN to complete payment of KES ${invoice.totalAmount.toLocaleString()}.`,
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
        };
      } else {
        this.logger.error(`❌ STK Push failed: ${response.data.ResponseDescription}`);
        return {
          success: false,
          message: response.data.ResponseDescription || 'Failed to initiate payment',
          error: response.data.ResponseCode,
        };
      }
    } catch (error: any) {
      this.logger.error('❌ STK Push failed:', error.response?.data || error.message);
      
      // Provide helpful error messages
      let errorMessage = 'Failed to initiate payment. Please try again.';
      const errorData = error.response?.data;
      
      if (errorData?.errorCode === '400.002.02') {
        errorMessage = 'M-Pesa rejected the request. This may be due to callback URL issues. Please try manual payment instead.';
      } else if (errorData?.errorMessage) {
        errorMessage = errorData.errorMessage;
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.response?.data?.errorCode || error.message,
      };
    }
  }

  /**
   * Get payment instructions for manual payment
   * Customer can send money directly to SmartDuka number
   */
  getManualPaymentInstructions(invoiceNumber: string, amount: number): {
    phoneNumber: string;
    amount: number;
    reference: string;
    instructions: string[];
  } {
    return {
      phoneNumber: '0729983567',
      amount,
      reference: `SD-${invoiceNumber}`,
      instructions: [
        '1. Open M-Pesa on your phone',
        '2. Select "Send Money"',
        '3. Enter number: 0729983567',
        `4. Enter amount: KES ${amount.toLocaleString()}`,
        `5. Enter reference: SD-${invoiceNumber}`,
        '6. Enter your M-Pesa PIN and confirm',
        '7. Save the confirmation message',
        '8. Click "Confirm Payment" below and enter the M-Pesa receipt code',
      ],
    };
  }

  /**
   * Confirm manual payment with M-Pesa receipt number
   * 
   * IMPORTANT: Manual payments require verification before subscription activation.
   * The receipt number is validated for format, but actual M-Pesa verification
   * should be done by admin or automated system.
   */
  async confirmManualPayment(
    invoiceId: string,
    shopId: string,
    mpesaReceiptNumber: string,
    paidAmount: number,
  ): Promise<PaymentConfirmation> {
    try {
      const invoice = await this.invoiceModel.findOne({
        _id: new Types.ObjectId(invoiceId),
        shopId: new Types.ObjectId(shopId),
      });

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

      // Validate M-Pesa receipt format (e.g., RKL2ABCD5E)
      const normalizedReceipt = mpesaReceiptNumber.toUpperCase().trim();
      if (!/^[A-Z0-9]{10}$/.test(normalizedReceipt)) {
        return {
          success: false,
          message: 'Invalid M-Pesa receipt number format. It should be 10 alphanumeric characters (e.g., RKL2ABCD5E)',
        };
      }

      // Check if this receipt number has already been used
      const existingPayment = await this.invoiceModel.findOne({
        mpesaReceiptNumber: normalizedReceipt,
        _id: { $ne: invoice._id },
      });
      
      if (existingPayment) {
        return {
          success: false,
          message: 'This M-Pesa receipt number has already been used for another payment',
        };
      }

      // Check if amount matches (allow small variance for fees)
      if (paidAmount < invoice.totalAmount * 0.95) {
        return {
          success: false,
          message: `Amount paid (KES ${paidAmount}) is less than invoice amount (KES ${invoice.totalAmount})`,
        };
      }

      // Update invoice as pending verification (NOT paid yet)
      // Admin will verify and mark as paid, which triggers activation
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          $set: {
            status: 'pending_verification',
            paymentMethod: 'mpesa_manual',
            mpesaReceiptNumber: normalizedReceipt,
            paidAmount,
            'manualPayment': {
              receiptNumber: normalizedReceipt,
              submittedAt: new Date(),
              pendingVerification: true,
              verifiedAt: null,
              verifiedBy: null,
            },
          },
          $inc: {
            paymentAttempts: 1,
          },
        },
      );

      this.logger.log(`Manual payment submitted for verification - Invoice: ${invoice.invoiceNumber}, Receipt: ${normalizedReceipt}`);

      // NOTE: Subscription is NOT activated here
      // It will be activated when admin verifies the payment or via automated verification

      return {
        success: true,
        message: 'Payment submitted for verification. Your subscription will be activated once the payment is confirmed (usually within 24 hours).',
        mpesaReceiptNumber: normalizedReceipt,
        transactionDate: new Date(),
        amount: paidAmount,
      };
    } catch (error: any) {
      this.logger.error('Failed to submit manual payment:', error.message);
      return {
        success: false,
        message: 'Failed to submit payment. Please try again or contact support.',
      };
    }
  }

  /**
   * Handle M-Pesa STK callback
   */
  async handleStkCallback(callbackData: any): Promise<void> {
    try {
      const { Body } = callbackData;
      const { stkCallback } = Body;
      const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

      this.logger.log(`STK Callback received: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

      // Find invoice by checkout request ID
      const invoice = await this.invoiceModel.findOne({
        'paymentAttempt.checkoutRequestId': CheckoutRequestID,
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found for checkout request: ${CheckoutRequestID}`);
        return;
      }

      if (ResultCode === 0) {
        // Payment successful
        const metadata = stkCallback.CallbackMetadata?.Item || [];
        const getMetaValue = (name: string) => 
          metadata.find((m: any) => m.Name === name)?.Value;

        const mpesaReceiptNumber = getMetaValue('MpesaReceiptNumber');
        const amount = getMetaValue('Amount');
        const transactionDate = getMetaValue('TransactionDate');

        await this.invoiceModel.updateOne(
          { _id: invoice._id },
          {
            $set: {
              status: 'paid',
              paidAt: new Date(),
              paymentMethod: 'mpesa_stk',
              mpesaReceiptNumber,
              paidAmount: amount,
              'stkPayment': {
                merchantRequestId: MerchantRequestID,
                checkoutRequestId: CheckoutRequestID,
                receiptNumber: mpesaReceiptNumber,
                amount,
                transactionDate,
                completedAt: new Date(),
              },
            },
          },
        );

        // Activate subscription after successful payment
        await this.activateSubscriptionAfterPayment(invoice.shopId.toString(), invoice._id.toString());

        this.logger.log(`Payment successful for invoice ${invoice.invoiceNumber}: ${mpesaReceiptNumber}`);
      } else {
        // Payment failed
        await this.invoiceModel.updateOne(
          { _id: invoice._id },
          {
            $set: {
              'paymentAttempt.failed': true,
              'paymentAttempt.failedAt': new Date(),
              'paymentAttempt.failureReason': ResultDesc,
            },
          },
        );

        this.logger.warn(`Payment failed for invoice ${invoice.invoiceNumber}: ${ResultDesc}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to process STK callback:', error.message);
    }
  }

  /**
   * Query STK Push transaction status
   */
  async queryStkStatus(checkoutRequestId: string): Promise<{
    success: boolean;
    resultCode?: number;
    resultDesc?: string;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const response = await axios.post(
        `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: this.shortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: response.data.ResultCode === '0',
        resultCode: parseInt(response.data.ResultCode),
        resultDesc: response.data.ResultDesc,
      };
    } catch (error: any) {
      this.logger.error('STK query failed:', error.message);
      return {
        success: false,
        resultDesc: 'Failed to query transaction status',
      };
    }
  }

  /**
   * Activate subscription after successful payment
   */
  private async activateSubscriptionAfterPayment(
    shopId: string,
    invoiceId: string,
  ): Promise<void> {
    try {
      // Get the subscription for this shop
      const subscription = await this.subscriptionModel.findOne({
        shopId: new Types.ObjectId(shopId),
      });

      if (!subscription) {
        this.logger.warn(`No subscription found for shop ${shopId}`);
        return;
      }

      // Get the invoice to retrieve payment details
      const invoice = await this.invoiceModel.findById(invoiceId);

      // Update subscription status to active
      const now = new Date();
      const periodEnd = new Date(now);
      
      if (subscription.billingCycle === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const updateData: any = {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        lastPaymentDate: now,
        failedPaymentAttempts: 0,
        gracePeriodEndDate: null,
      };

      // Add payment details from invoice if available
      if (invoice) {
        updateData.lastPaymentAmount = invoice.totalAmount;
        updateData.lastPaymentMethod = invoice.paymentMethod;
        updateData.lastPaymentReference = invoice.mpesaReceiptNumber || invoice.paymentReference;
      }

      await this.subscriptionModel.updateOne(
        { _id: subscription._id },
        { $set: updateData },
      );

      this.logger.log(`Subscription activated for shop ${shopId} until ${periodEnd}`);
    } catch (error: any) {
      this.logger.error(`Failed to activate subscription for shop ${shopId}:`, error.message);
    }
  }

  /**
   * Validate M-Pesa receipt number format
   * Format: 10 alphanumeric characters (e.g., RKL2ABCD5E)
   */
  validateReceiptNumber(receiptNumber: string): {
    valid: boolean;
    message?: string;
  } {
    if (!receiptNumber) {
      return { valid: false, message: 'Receipt number is required' };
    }

    const cleaned = receiptNumber.trim().toUpperCase();

    // M-Pesa receipt format: 10 alphanumeric characters
    if (!/^[A-Z0-9]{10}$/.test(cleaned)) {
      return { 
        valid: false, 
        message: 'Invalid receipt format. M-Pesa receipt should be 10 characters (e.g., RKL2ABCD5E)' 
      };
    }

    // Check for common patterns (starts with letter, contains mix)
    if (!/^[A-Z]/.test(cleaned)) {
      return { 
        valid: false, 
        message: 'M-Pesa receipt should start with a letter' 
      };
    }

    return { valid: true };
  }

  /**
   * Get payment summary for display
   */
  getPaymentSummary(amount: number, invoiceNumber: string): {
    amount: number;
    formattedAmount: string;
    recipient: string;
    recipientName: string;
    reference: string;
    stkPushInstructions: string[];
    sendMoneyInstructions: string[];
  } {
    return {
      amount,
      formattedAmount: `KES ${amount.toLocaleString()}`,
      recipient: '0729983567',
      recipientName: 'SmartDuka',
      reference: `SD-${invoiceNumber}`,
      stkPushInstructions: [
        'Enter your M-Pesa registered phone number',
        'Click "Pay with M-Pesa"',
        'You will receive a payment prompt on your phone',
        'Enter your M-Pesa PIN to complete payment',
        'Wait for confirmation (usually within 30 seconds)',
      ],
      sendMoneyInstructions: [
        'Open M-Pesa on your phone',
        'Select "Send Money"',
        'Enter number: 0729983567',
        `Enter amount: KES ${amount.toLocaleString()}`,
        'Enter your M-Pesa PIN and confirm',
        'Save the confirmation message',
        'Enter the 10-character receipt code below',
      ],
    };
  }
}
