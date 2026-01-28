import { Injectable, Logger, BadRequestException, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceDocument,
} from './schemas/subscription-invoice.schema';
import {
  PaymentAttempt,
  PaymentAttemptDocument,
  PaymentMethod,
  PaymentAttemptStatus,
  PaymentAttemptType,
} from './schemas/payment-attempt.schema';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './schemas/subscription.schema';
import { SystemConfig, SystemConfigDocument, SystemConfigType } from '../super-admin/schemas/system-config.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MpesaEncryptionService } from '../payments/services/mpesa-encryption.service';
import type { SubscriptionsService } from './subscriptions.service';
import {
  isSandboxTestNumber,
  getSimulationScenario,
  getSimulationResponse,
  generateSandboxReceiptNumber,
  SANDBOX_MODE_ERROR,
  SandboxSimulationScenario,
  SimulationResponse,
} from '../payments/constants/mpesa-sandbox.constants';

/**
 * SmartDuka Subscription M-Pesa Payment Service
 * 
 * This service handles M-Pesa payments for subscription invoices.
 * Uses the SYSTEM PAYBILL configuration from:
 * 1. Database (SystemConfig) - managed by super admin
 * 2. Environment variables - fallback if database config not set
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
export class SubscriptionMpesaService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionMpesaService.name);
  
  // SmartDuka payment receiving number (for manual payments)
  private readonly SMARTDUKA_PHONE = '254729983567';
  
  // System M-Pesa API configuration - loaded from DB or env
  private consumerKey: string = '';
  private consumerSecret: string = '';
  private passKey: string = '';
  private shortCode: string = '174379';
  private environment: 'sandbox' | 'production' = 'sandbox';
  private callbackUrl: string = '';
  private configSource: 'database' | 'environment' = 'environment';
  
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(
    @InjectModel(SubscriptionInvoice.name)
    private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SystemConfig.name)
    private readonly systemConfigModel: Model<SystemConfigDocument>,
    @InjectModel(PaymentAttempt.name)
    private readonly paymentAttemptModel: Model<PaymentAttemptDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly encryptionService: MpesaEncryptionService,
    @Inject(forwardRef(() => require('./subscriptions.service').SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async onModuleInit() {
    await this.loadConfiguration();
  }

  /**
   * Load M-Pesa configuration from database or environment
   * Database config takes priority if available and active
   */
  private async loadConfiguration(): Promise<void> {
    try {
      // Try to load from database first
      const dbConfig = await this.systemConfigModel.findOne({ 
        type: SystemConfigType.MPESA,
        isActive: true,
      });

      if (dbConfig && dbConfig.config) {
        // Decrypt credentials from database
        try {
          if (dbConfig.config.consumerKey && dbConfig.config.consumerKeyIv && dbConfig.config.consumerKeyTag) {
            this.consumerKey = this.encryptionService.decrypt(
              dbConfig.config.consumerKey,
              dbConfig.config.consumerKeyIv,
              dbConfig.config.consumerKeyTag,
            );
          }
          if (dbConfig.config.consumerSecret && dbConfig.config.consumerSecretIv && dbConfig.config.consumerSecretTag) {
            this.consumerSecret = this.encryptionService.decrypt(
              dbConfig.config.consumerSecret,
              dbConfig.config.consumerSecretIv,
              dbConfig.config.consumerSecretTag,
            );
          }
          if (dbConfig.config.passkey && dbConfig.config.passkeyIv && dbConfig.config.passkeyTag) {
            this.passKey = this.encryptionService.decrypt(
              dbConfig.config.passkey,
              dbConfig.config.passkeyIv,
              dbConfig.config.passkeyTag,
            );
          }

          this.shortCode = dbConfig.config.shortCode || '174379';
          this.environment = dbConfig.environment as 'sandbox' | 'production';
          this.callbackUrl = dbConfig.config.callbackUrl || this.configService.get('MPESA_CALLBACK_URL', '');
          this.configSource = 'database';

          this.logger.log(`✅ M-Pesa config loaded from DATABASE`);
        } catch (decryptError) {
          this.logger.error('Failed to decrypt database M-Pesa config, falling back to env', decryptError);
        }
      }

      // Fallback to environment variables if database config not available
      if (this.configSource !== 'database' || !this.consumerKey) {
        this.consumerKey = this.configService.get('MPESA_CONSUMER_KEY', '');
        this.consumerSecret = this.configService.get('MPESA_CONSUMER_SECRET', '');
        this.passKey = this.configService.get('MPESA_PASSKEY', '');
        this.shortCode = this.configService.get('MPESA_SHORTCODE', '174379');
        this.environment = this.configService.get('MPESA_ENV', 'sandbox') as 'sandbox' | 'production';
        this.callbackUrl = this.configService.get('MPESA_CALLBACK_URL', '');
        this.configSource = 'environment';
        
        if (this.consumerKey) {
          this.logger.log(`✅ M-Pesa config loaded from ENVIRONMENT`);
        }
      }
    } catch (error) {
      this.logger.error('Error loading M-Pesa config from database', error);
      // Fallback to environment
      this.consumerKey = this.configService.get('MPESA_CONSUMER_KEY', '');
      this.consumerSecret = this.configService.get('MPESA_CONSUMER_SECRET', '');
      this.passKey = this.configService.get('MPESA_PASSKEY', '');
      this.shortCode = this.configService.get('MPESA_SHORTCODE', '174379');
      this.environment = this.configService.get('MPESA_ENV', 'sandbox') as 'sandbox' | 'production';
      this.callbackUrl = this.configService.get('MPESA_CALLBACK_URL', '');
      this.configSource = 'environment';
    }

    // Log configuration status
    this.logger.log(`Subscription M-Pesa Service initialized:`);
    this.logger.log(`  - Config Source: ${this.configSource.toUpperCase()}`);
    this.logger.log(`  - Environment: ${this.environment}`);
    this.logger.log(`  - ShortCode: ${this.shortCode}`);
    this.logger.log(`  - Consumer Key: ${this.consumerKey ? this.consumerKey.substring(0, 10) + '...' : 'NOT SET'}`);
    this.logger.log(`  - Callback URL: ${this.callbackUrl || 'NOT SET'}`);
    
    if (!this.consumerKey || !this.consumerSecret) {
      this.logger.error('❌ M-Pesa credentials not configured! STK Push will fail.');
      this.logger.error('   Configure via Super Admin dashboard or set MPESA_* environment variables.');
    }
  }

  /**
   * Reload configuration (called when super admin updates config)
   */
  async reloadConfiguration(): Promise<void> {
    this.accessToken = '';
    this.tokenExpiry = 0;
    await this.loadConfiguration();
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
    
    // If callback URL is empty, try to get from environment
    if (!baseUrl) {
      baseUrl = this.configService.get('MPESA_CALLBACK_URL', '');
    }
    
    // If still empty, throw error - can't proceed without callback URL
    if (!baseUrl) {
      this.logger.error('❌ MPESA_CALLBACK_URL is not configured!');
      throw new Error('M-Pesa callback URL is not configured. Please set MPESA_CALLBACK_URL in environment or configure via Super Admin dashboard.');
    }
    
    // If callback URL contains the full path, extract just the base
    if (baseUrl.includes('/payments/mpesa/callback')) {
      baseUrl = baseUrl.replace('/payments/mpesa/callback', '');
    }
    
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    
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

      // SANDBOX MODE: Only allow sandbox test numbers
      if (this.environment === 'sandbox') {
        if (!isSandboxTestNumber(formattedPhone)) {
          this.logger.warn(`🧪 SANDBOX: Rejecting non-test number ${formattedPhone}`);
          return {
            success: false,
            message: SANDBOX_MODE_ERROR.message,
            error: 'SANDBOX_ONLY',
          };
        }
        
        // For sandbox test numbers, simulate the STK push response
        this.logger.log(`🧪 SANDBOX: Simulating STK Push for test number ${formattedPhone}`);
        const scenario = getSimulationScenario(formattedPhone);
        this.logger.log(`🧪 SANDBOX: Scenario = ${scenario}`);
        
        // Generate fake checkout/merchant request IDs
        const fakeCheckoutId = `ws_CO_SANDBOX_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const fakeMerchantId = `SANDBOX_${Date.now()}`;
        
        // Update invoice with simulated payment attempt
        await this.invoiceModel.updateOne(
          { _id: invoice._id },
          {
            $set: {
              'paymentAttempt': {
                checkoutRequestId: fakeCheckoutId,
                merchantRequestId: fakeMerchantId,
                phoneNumber: formattedPhone,
                initiatedAt: new Date(),
                sandboxScenario: scenario,
              },
            },
          },
        );
        
        this.logger.log(`🧪 SANDBOX: STK Push simulated! CheckoutRequestID: ${fakeCheckoutId}, Scenario: ${scenario}`);
        
        return {
          success: true,
          message: `🧪 SANDBOX: Payment request simulated for ${phoneNumber}. Scenario: ${scenario}. Wait for simulated response.`,
          checkoutRequestId: fakeCheckoutId,
          merchantRequestId: fakeMerchantId,
        };
      }

      // PRODUCTION MODE: Make real API call
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
   * Initiate STK Push for plan upgrade payment
   * Does NOT change the plan - plan change happens after payment confirmation via callback
   * 
   * @param phoneNumber - Customer's phone number
   * @param shopId - Shop making the payment
   * @param planCode - Target plan code
   * @param billingCycle - monthly or annual
   * @param amount - Payment amount
   */
  async initiateUpgradePayment(
    phoneNumber: string,
    shopId: string,
    planCode: string,
    billingCycle: 'monthly' | 'annual',
    amount: number,
  ): Promise<StkPushResult> {
    try {
      this.logger.log(`=== INITIATING UPGRADE PAYMENT (NO PLAN CHANGE YET) ===`);
      this.logger.log(`Shop ID: ${shopId}`);
      this.logger.log(`Target Plan: ${planCode}`);
      this.logger.log(`Billing Cycle: ${billingCycle}`);
      this.logger.log(`Amount: KES ${amount}`);
      this.logger.log(`Phone: ${phoneNumber}`);

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Validate phone number
      if (!/^254[71]\d{8}$/.test(formattedPhone)) {
        return {
          success: false,
          message: 'Invalid phone number. Please use a valid Safaricom number (07XX or 01XX).',
          error: 'INVALID_PHONE',
        };
      }

      // Reload config to ensure we have latest credentials
      await this.loadConfiguration();

      if (!this.consumerKey || !this.consumerSecret) {
        return {
          success: false,
          message: 'M-Pesa is not configured. Please contact support or use manual payment.',
          error: 'NOT_CONFIGURED',
        };
      }

      // Get access token using SYSTEM credentials
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);
      const callbackUrl = this.getSubscriptionCallbackUrl();

      // Create a unique reference for this upgrade payment
      // Format: UPGRADE-{shopId last 6 chars}-{planCode}-{timestamp}
      const shortShopId = shopId.slice(-6);
      const accountRef = `UPG${shortShopId}${planCode}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
      
      // Description includes plan info for callback processing
      const description = `Upgrade${planCode}`.slice(0, 13);

      // STK Push request using SYSTEM PAYBILL
      const stkRequest = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: formattedPhone,
        PartyB: this.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountRef,
        TransactionDesc: description,
      };

      this.logger.log(`STK Push Request for Upgrade:`);
      this.logger.log(`  - ShortCode: ${this.shortCode}`);
      this.logger.log(`  - Amount: KES ${amount}`);
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
        // Store pending upgrade info for callback processing
        // The callback will use this to upgrade the plan after payment success
        await this.storePendingUpgrade(
          shopId,
          planCode,
          billingCycle,
          amount,
          response.data.CheckoutRequestID,
          response.data.MerchantRequestID,
        );

        this.logger.log(`✅ STK Push sent successfully for upgrade to ${planCode}`);
        return {
          success: true,
          message: `Payment request sent to ${phoneNumber}. Please enter your M-Pesa PIN to complete payment of KES ${amount.toLocaleString()}. Your plan will be upgraded after payment confirmation.`,
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
      this.logger.error('❌ Upgrade STK Push failed:', error.response?.data || error.message);
      
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
   * Store pending upgrade info for callback processing
   */
  private async storePendingUpgrade(
    shopId: string,
    planCode: string,
    billingCycle: 'monthly' | 'annual',
    amount: number,
    checkoutRequestId: string,
    merchantRequestId: string,
  ): Promise<void> {
    // Store in subscription metadata for callback to process
    await this.subscriptionModel.findOneAndUpdate(
      { shopId: new Types.ObjectId(shopId) },
      {
        $set: {
          'metadata.pendingUpgrade': {
            planCode,
            billingCycle,
            amount,
            checkoutRequestId,
            merchantRequestId,
            initiatedAt: new Date(),
            status: 'pending',
          },
        },
      },
    );
    this.logger.log(`Stored pending upgrade for shop ${shopId}: ${planCode} (${billingCycle})`);
  }

  /**
   * Submit manual payment for plan upgrade
   * 
   * IMPORTANT: This does NOT activate the upgrade immediately!
   * The payment is marked as 'pending_verification' and requires:
   * 1. Super admin to verify the receipt, OR
   * 2. Automated M-Pesa verification system to confirm
   * 
   * Only after verification will the plan change occur via activatePendingUpgrade()
   */
  async submitManualUpgradePayment(
    shopId: string,
    mpesaReceiptNumber: string,
    amount: number,
  ): Promise<PaymentConfirmation> {
    try {
      this.logger.log(`=== SUBMITTING MANUAL UPGRADE PAYMENT FOR VERIFICATION ===`);
      this.logger.log(`Shop ID: ${shopId}`);
      this.logger.log(`Receipt: ${mpesaReceiptNumber}`);
      this.logger.log(`Amount: KES ${amount}`);

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
      });
      
      if (existingPayment) {
        return {
          success: false,
          message: 'This M-Pesa receipt number has already been used for another payment',
        };
      }

      // Get current subscription with pending upgrade
      const subscription = await this.subscriptionModel.findOne({
        shopId: new Types.ObjectId(shopId),
      });

      if (!subscription) {
        return {
          success: false,
          message: 'Subscription not found',
        };
      }

      // Must have a pending upgrade to submit payment for
      if (!subscription.pendingUpgrade) {
        return {
          success: false,
          message: 'No pending upgrade found. Please initiate an upgrade first.',
        };
      }

      // Find the invoice for this pending upgrade
      const invoice = await this.invoiceModel.findById(subscription.pendingUpgrade.invoiceId);
      if (!invoice) {
        return {
          success: false,
          message: 'Upgrade invoice not found. Please initiate a new upgrade.',
        };
      }

      // Verify amount matches (allow 5% variance for fees)
      if (amount < invoice.totalAmount * 0.95) {
        return {
          success: false,
          message: `Amount paid (KES ${amount}) is less than required (KES ${invoice.totalAmount})`,
        };
      }

      // Update invoice with payment details - mark as PENDING VERIFICATION
      // Plan will NOT change until super admin verifies or automated system confirms
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          $set: {
            status: 'pending_verification',
            paymentMethod: 'mpesa_manual',
            mpesaReceiptNumber: normalizedReceipt,
            paidAmount: amount,
            'manualPayment': {
              receiptNumber: normalizedReceipt,
              submittedAt: new Date(),
              pendingVerification: true,
              claimedAmount: amount,
              verifiedAt: null,
              verifiedBy: null,
            },
          },
          $inc: {
            paymentAttempts: 1,
          },
        },
      );

      this.logger.log(`📋 Manual payment submitted for verification - Invoice: ${invoice.invoiceNumber}, Receipt: ${normalizedReceipt}`);
      this.logger.log(`⏳ Plan change will occur ONLY after super admin verification`);

      return {
        success: true,
        message: `Payment submitted for verification! Your plan will be upgraded to ${subscription.pendingUpgrade.planCode} once the payment is verified by our team (usually within 24 hours).`,
        mpesaReceiptNumber: normalizedReceipt,
      };
    } catch (error: any) {
      this.logger.error('❌ Manual upgrade payment submission failed:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to submit payment',
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
    senderPhoneNumber?: string,
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

      // Get subscription and shop details for the payment attempt record
      const subscription = await this.subscriptionModel.findById(invoice.subscriptionId).lean();
      const shop = await this.shopModel.findById(shopId).lean();
      const shopAdmin = await this.userModel.findOne({ shopId: new Types.ObjectId(shopId), role: 'admin' }).lean();
      
      // Determine payment type based on invoice type
      let paymentType = PaymentAttemptType.SUBSCRIPTION;
      if (invoice.type === 'upgrade') {
        paymentType = PaymentAttemptType.UPGRADE;
      }

      // Normalize sender phone number if provided
      const normalizedSenderPhone = senderPhoneNumber?.replace(/\D/g, '') || null;

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
              senderPhoneNumber: normalizedSenderPhone,
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

      // Create PaymentAttempt record for tracking in super admin dashboard
      await this.paymentAttemptModel.create({
        shopId: new Types.ObjectId(shopId),
        shopName: shop?.name,
        userEmail: shopAdmin?.email,
        method: PaymentMethod.MPESA_MANUAL,
        type: paymentType,
        status: PaymentAttemptStatus.PENDING_APPROVAL,
        amount: paidAmount,
        currency: 'KES',
        planCode: subscription?.planCode,
        billingCycle: subscription?.billingCycle,
        invoiceId: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        mpesaReceiptNumber: normalizedReceipt,
        phoneNumber: normalizedSenderPhone,
        initiatedAt: new Date(),
        metadata: {
          source: 'send_money',
          invoiceType: invoice.type,
          senderPhoneNumber: normalizedSenderPhone,
        },
      });

      this.logger.log(`Manual payment submitted for verification - Invoice: ${invoice.invoiceNumber}, Receipt: ${normalizedReceipt}, Sender: ${normalizedSenderPhone || 'not provided'}`);

      // NOTE: Subscription is NOT activated here
      // It will be activated when admin verifies the payment or via automated verification

      return {
        success: true,
        message: 'Payment submitted for verification. Your subscription will be activated once the payment is confirmed (usually within 1-5 minutes).',
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

        // Emit refresh events for real-time UI updates
        this.emitRefreshEvents(invoice.shopId.toString(), invoice._id.toString());

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
   * 
   * In SANDBOX mode: Simulates successful payment after a short delay
   * In PRODUCTION mode: Queries M-Pesa API for actual status
   */
  async queryStkStatus(checkoutRequestId: string): Promise<{
    success: boolean;
    resultCode?: number;
    resultDesc?: string;
  }> {
    // SANDBOX SIMULATION: Simulate different payment scenarios
    if (this.environment === 'sandbox') {
      // Check if we have a pending payment attempt for this checkout
      const invoice = await this.invoiceModel.findOne({
        'paymentAttempt.checkoutRequestId': checkoutRequestId,
      });

      if (invoice) {
        const initiatedAt = invoice.paymentAttempt?.initiatedAt;
        const phoneNumber = invoice.paymentAttempt?.phoneNumber || '';
        const savedScenario = invoice.paymentAttempt?.sandboxScenario as SandboxSimulationScenario;
        
        // Get the simulation response for this phone number
        const scenario = savedScenario || getSimulationScenario(phoneNumber);
        const simResponse = getSimulationResponse(phoneNumber);
        
        if (initiatedAt) {
          const elapsedMs = Date.now() - new Date(initiatedAt).getTime();
          
          // Check if enough time has passed for this scenario
          if (elapsedMs >= simResponse.delayMs) {
            this.logger.log(`🧪 SANDBOX: Simulating ${scenario} for ${checkoutRequestId}`);
            
            if (simResponse.shouldSucceed) {
              // Generate a fake receipt number for sandbox
              const fakeReceipt = generateSandboxReceiptNumber();
              
              // Simulate success callback
              await this.handleStkCallback({
                Body: {
                  stkCallback: {
                    MerchantRequestID: invoice.paymentAttempt?.merchantRequestId || 'SANDBOX',
                    CheckoutRequestID: checkoutRequestId,
                    ResultCode: 0,
                    ResultDesc: 'The service request is processed successfully.',
                    CallbackMetadata: {
                      Item: [
                        { Name: 'Amount', Value: invoice.totalAmount },
                        { Name: 'MpesaReceiptNumber', Value: fakeReceipt },
                        { Name: 'TransactionDate', Value: new Date().toISOString() },
                      ],
                    },
                  },
                },
              });

              return {
                success: true,
                resultCode: 0,
                resultDesc: `🧪 SANDBOX: Payment successful (${scenario})`,
              };
            } else {
              // Simulate failure callback
              await this.handleStkCallback({
                Body: {
                  stkCallback: {
                    MerchantRequestID: invoice.paymentAttempt?.merchantRequestId || 'SANDBOX',
                    CheckoutRequestID: checkoutRequestId,
                    ResultCode: simResponse.resultCode,
                    ResultDesc: simResponse.resultDesc,
                  },
                },
              });

              return {
                success: false,
                resultCode: simResponse.resultCode,
                resultDesc: `🧪 SANDBOX: ${simResponse.resultDesc} (${scenario})`,
              };
            }
          }
          
          // Still waiting for simulated delay
          const remainingSeconds = Math.ceil((simResponse.delayMs - elapsedMs) / 1000);
          this.logger.debug(`🧪 SANDBOX: Waiting for ${scenario} simulation (${remainingSeconds}s remaining)`);
          return {
            success: false,
            resultDesc: `🧪 SANDBOX: Payment processing... (${scenario} in ${remainingSeconds}s)`,
          };
        }
      }
      
      return {
        success: false,
        resultDesc: '🧪 SANDBOX: Transaction not found',
      };
    }

    // PRODUCTION: Query actual M-Pesa API
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
          timeout: 30000,
        },
      );

      return {
        success: response.data.ResultCode === '0',
        resultCode: parseInt(response.data.ResultCode),
        resultDesc: response.data.ResultDesc,
      };
    } catch (error: any) {
      // Handle rate limiting (429) gracefully
      if (error.response?.status === 429) {
        this.logger.warn('M-Pesa API rate limited (429). Will retry on next poll.');
        return {
          success: false,
          resultDesc: 'Rate limited - please wait',
        };
      }
      
      this.logger.error('STK query failed:', error.message);
      return {
        success: false,
        resultDesc: 'Failed to query transaction status',
      };
    }
  }

  /**
   * Activate subscription after successful payment
   * 
   * If there's a pending upgrade, activates that instead of just updating status.
   * This ensures plan changes only happen AFTER payment is confirmed.
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

      // Check if this payment is for a pending upgrade
      if (subscription.pendingUpgrade && 
          (subscription.pendingUpgrade.invoiceId === invoiceId || 
           invoice?.type === 'upgrade')) {
        
        this.logger.log(`Activating pending upgrade for shop ${shopId} after payment confirmation`);
        
        // Use the subscriptions service to activate the upgrade
        const result = await this.subscriptionsService.activatePendingUpgrade(shopId, invoiceId);
        
        if (result) {
          this.logger.log(`✅ Pending upgrade activated for shop ${shopId}: ${result.planCode}`);
        } else {
          this.logger.warn(`Failed to activate pending upgrade for shop ${shopId}`);
        }
        return;
      }

      // No pending upgrade - just activate/renew the subscription
      const now = new Date();
      const periodEnd = new Date(now);
      
      if (subscription.billingCycle === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (subscription.billingCycle === 'daily') {
        // Daily billing - default to 1 day if numberOfDays not set
        const days = subscription.numberOfDays || 1;
        periodEnd.setDate(periodEnd.getDate() + days);
      } else {
        // Monthly billing (default)
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
   * Emit refresh events for real-time UI updates after payment verification
   * TODO: Implement WebSocket/SSE for real-time updates
   */
  private emitRefreshEvents(shopId: string, invoiceId: string): void {
    try {
      // For now, just log the events that should be emitted
      // These will be picked up by the frontend polling mechanisms
      this.logger.log(`Payment verified for shop ${shopId}, invoice ${invoiceId} - UI should refresh subscription status`);
      
      // TODO: Implement actual WebSocket/SSE event emission:
      // - payment:completed event for user who paid
      // - subscription:updated event for subscription page refresh
      // - invoice:paid event for billing history refresh
      // - admin:payment_verified event for super admin dashboard
    } catch (error) {
      this.logger.warn(`Failed to log refresh events: ${error.message}`);
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
