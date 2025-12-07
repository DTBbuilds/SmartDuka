import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { MpesaTransaction, MpesaTransactionDocument } from '../schemas/mpesa-transaction.schema';
import { MpesaEncryptionService } from './mpesa-encryption.service';

/**
 * Multi-Tenant M-Pesa Service
 * 
 * Handles M-Pesa STK Push for multiple shops, each with their own:
 * - Paybill or Till number
 * - Consumer Key & Secret
 * - Passkey
 * 
 * Architecture:
 * 1. Shop-specific credentials: Each shop can configure their own M-Pesa account
 * 2. Platform fallback: Shops without credentials use platform's shared account
 * 3. Account Reference: Contains shopId for transaction routing
 * 
 * Security:
 * - All sensitive credentials are encrypted at rest using AES-256-GCM
 * - Credentials are decrypted only when needed for API calls
 * - Each shop's credentials are isolated from other shops
 */
@Injectable()
export class MpesaMultiTenantService {
  private readonly logger = new Logger(MpesaMultiTenantService.name);
  private readonly baseUrl: string;
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    @InjectModel(MpesaTransaction.name) private readonly transactionModel: Model<MpesaTransactionDocument>,
    private readonly configService: ConfigService,
    private readonly encryptionService: MpesaEncryptionService,
  ) {
    // Use sandbox for development, production URL for live
    const environment = this.configService.get<string>('MPESA_ENVIRONMENT', 'sandbox');
    this.baseUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get M-Pesa credentials for a shop
   * NO FALLBACK - Each shop MUST configure their own M-Pesa credentials
   * Decrypts encrypted credentials before returning
   */
  async getShopMpesaConfig(shopId: string): Promise<{
    shortCode: string;
    type: 'paybill' | 'till';
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    callbackUrl: string;
    accountPrefix?: string;
    isConfigured: boolean;
    isVerified: boolean;
  }> {
    const shop = await this.shopModel.findById(shopId).exec();
    
    if (!shop) {
      throw new BadRequestException('Shop not found');
    }

    // Check if shop has their own M-Pesa configuration
    const hasConfig = !!(
      shop.mpesaConfig?.enabled && 
      shop.mpesaConfig?.shortCode && 
      shop.mpesaConfig?.consumerKey &&
      shop.mpesaConfig?.consumerSecret &&
      shop.mpesaConfig?.passkey
    );

    if (!hasConfig) {
      this.logger.warn(`Shop ${shopId} has not configured M-Pesa credentials`);
      return {
        shortCode: '',
        type: 'paybill',
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        callbackUrl: this.getDefaultCallbackUrl(),
        isConfigured: false,
        isVerified: false,
      };
    }

    // Decrypt credentials
    const decryptedConfig = this.encryptionService.decryptMpesaConfig(shop.mpesaConfig!);
    
    this.logger.log(`Using shop-specific M-Pesa config for shop ${shopId}`);
    
    return {
      shortCode: shop.mpesaConfig!.shortCode!,
      type: shop.mpesaConfig!.type || 'paybill',
      consumerKey: decryptedConfig.consumerKey || '',
      consumerSecret: decryptedConfig.consumerSecret || '',
      passkey: decryptedConfig.passkey || '',
      callbackUrl: shop.mpesaConfig!.callbackUrl || this.getDefaultCallbackUrl(),
      accountPrefix: shop.mpesaConfig!.accountPrefix,
      isConfigured: true,
      isVerified: shop.mpesaConfig!.verificationStatus === 'verified',
    };
  }

  /**
   * Check if a shop has M-Pesa configured and verified
   */
  async getMpesaConfigStatus(shopId: string): Promise<{
    isConfigured: boolean;
    isVerified: boolean;
    isEnabled: boolean;
    shortCode?: string;
    type?: 'paybill' | 'till';
    verificationStatus?: 'pending' | 'verified' | 'failed';
    lastTestedAt?: Date;
    message: string;
  }> {
    const shop = await this.shopModel.findById(shopId).exec();
    
    if (!shop) {
      throw new BadRequestException('Shop not found');
    }

    const mpesaConfig = shop.mpesaConfig;

    // Check configuration completeness
    const hasCredentials = !!(
      mpesaConfig?.shortCode &&
      mpesaConfig?.consumerKey &&
      mpesaConfig?.consumerSecret &&
      mpesaConfig?.passkey
    );

    const isEnabled = mpesaConfig?.enabled === true;
    const isVerified = mpesaConfig?.verificationStatus === 'verified';

    let message = '';
    if (!hasCredentials) {
      message = 'M-Pesa not configured. Please add your Paybill/Till credentials to accept mobile payments.';
    } else if (!isEnabled) {
      message = 'M-Pesa credentials saved but not enabled. Enable M-Pesa in settings to accept payments.';
    } else if (!isVerified) {
      message = 'M-Pesa credentials pending verification. Please verify your credentials.';
    } else {
      message = 'M-Pesa is configured and ready to accept payments.';
    }

    return {
      isConfigured: hasCredentials,
      isVerified,
      isEnabled,
      shortCode: mpesaConfig?.shortCode,
      type: mpesaConfig?.type,
      verificationStatus: mpesaConfig?.verificationStatus,
      lastTestedAt: mpesaConfig?.lastTestedAt,
      message,
    };
  }

  /**
   * Get all shops that don't have M-Pesa configured (for admin reminders)
   */
  async getShopsWithoutMpesaConfig(): Promise<{ shopId: string; shopName: string; email: string; createdAt: Date }[]> {
    const shops = await this.shopModel.find({
      status: 'active',
      $or: [
        { 'mpesaConfig.enabled': { $ne: true } },
        { 'mpesaConfig.shortCode': { $exists: false } },
        { 'mpesaConfig.consumerKey': { $exists: false } },
        { 'mpesaConfig.verificationStatus': { $ne: 'verified' } },
      ],
    }).select('_id name email createdAt').lean().exec();

    return shops.map(shop => ({
      shopId: shop._id.toString(),
      shopName: shop.name,
      email: shop.email,
      createdAt: (shop as any).createdAt,
    }));
  }

  /**
   * Get OAuth token for M-Pesa API
   * Caches tokens per credential set to avoid unnecessary API calls
   */
  async getAccessToken(consumerKey: string, consumerSecret: string): Promise<string> {
    const cacheKey = `${consumerKey}:${consumerSecret}`;
    const cached = this.tokenCache.get(cacheKey);
    
    // Return cached token if still valid (with 60s buffer)
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }

    try {
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.status}`);
      }

      const data = await response.json();
      const token = data.access_token;
      const expiresIn = parseInt(data.expires_in || '3599', 10);

      // Cache the token
      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + (expiresIn * 1000),
      });

      return token;
    } catch (error: any) {
      this.logger.error(`Failed to get M-Pesa access token: ${error.message}`);
      throw new BadRequestException('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * Initiate STK Push for a shop
   * REQUIRES shop-specific credentials - no fallback to platform credentials
   */
  async initiateSTKPush(params: {
    shopId: string;
    phoneNumber: string;
    amount: number;
    orderId: string;
    orderNumber: string;
    description?: string;
  }): Promise<{
    success: boolean;
    checkoutRequestId?: string;
    merchantRequestId?: string;
    responseCode?: string;
    responseDescription?: string;
    transactionId?: string;
    error?: string;
  }> {
    const { shopId, phoneNumber, amount, orderId, orderNumber, description } = params;

    // Get shop's M-Pesa configuration
    const config = await this.getShopMpesaConfig(shopId);

    // Strict check - shop MUST have their own M-Pesa configured
    if (!config.isConfigured) {
      throw new BadRequestException(
        'M-Pesa is not configured for this shop. Please configure your Paybill/Till number in Settings → M-Pesa to accept mobile payments.'
      );
    }

    if (!config.isVerified) {
      throw new BadRequestException(
        'M-Pesa credentials are not verified. Please verify your credentials in Settings → M-Pesa before accepting payments.'
      );
    }

    // Format phone number (ensure it starts with 254)
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    // Generate timestamp
    const timestamp = this.generateTimestamp();

    // Generate password (Base64 of ShortCode + Passkey + Timestamp)
    const password = Buffer.from(`${config.shortCode}${config.passkey}${timestamp}`).toString('base64');

    // Build account reference using shop's prefix or order number
    const accountReference = `${config.accountPrefix || ''}${orderNumber}`.slice(0, 12);

    try {
      // Get access token
      const accessToken = await this.getAccessToken(config.consumerKey, config.consumerSecret);

      // Prepare STK Push request
      const stkRequest = {
        BusinessShortCode: config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: config.type === 'till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
        Amount: Math.round(amount), // M-Pesa requires whole numbers
        PartyA: formattedPhone,
        PartyB: config.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: config.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: description || `Payment for ${orderNumber}`,
      };

      this.logger.log(`Initiating STK Push for shop ${shopId}, order ${orderNumber}, amount ${amount}`);

      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkRequest),
      });

      const data = await response.json();

      if (data.ResponseCode === '0') {
        // Create transaction record
        const transaction = new this.transactionModel({
          shopId: new Types.ObjectId(shopId),
          orderId: new Types.ObjectId(orderId),
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID,
          amount,
          phoneNumber: formattedPhone,
          accountReference,
          status: 'PENDING',
          shortCode: config.shortCode,
          isShopSpecific: true, // All configs are now shop-specific
        });
        await transaction.save();

        return {
          success: true,
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID,
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription,
          transactionId: transaction._id.toString(),
        };
      } else {
        this.logger.error(`STK Push failed: ${JSON.stringify(data)}`);
        return {
          success: false,
          responseCode: data.ResponseCode,
          responseDescription: data.ResponseDescription || data.errorMessage,
          error: data.ResponseDescription || 'STK Push failed',
        };
      }
    } catch (error: any) {
      this.logger.error(`STK Push error: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to initiate payment',
      };
    }
  }

  /**
   * Query STK Push status
   */
  async querySTKStatus(shopId: string, checkoutRequestId: string): Promise<{
    success: boolean;
    resultCode?: string;
    resultDesc?: string;
    status?: string;
  }> {
    const config = await this.getShopMpesaConfig(shopId);
    const timestamp = this.generateTimestamp();
    const password = Buffer.from(`${config.shortCode}${config.passkey}${timestamp}`).toString('base64');

    try {
      const accessToken = await this.getAccessToken(config.consumerKey, config.consumerSecret);

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      });

      const data = await response.json();

      // Update transaction status
      if (data.ResultCode !== undefined) {
        const status = data.ResultCode === '0' ? 'COMPLETED' : 'FAILED';
        await this.transactionModel.findOneAndUpdate(
          { checkoutRequestId },
          { 
            status,
            resultCode: data.ResultCode,
            resultDesc: data.ResultDesc,
          },
        );
      }

      return {
        success: data.ResultCode === '0',
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        status: data.ResultCode === '0' ? 'COMPLETED' : (data.ResultCode ? 'FAILED' : 'PENDING'),
      };
    } catch (error: any) {
      this.logger.error(`STK Query error: ${error.message}`);
      return {
        success: false,
        resultDesc: error.message,
      };
    }
  }

  /**
   * Handle M-Pesa callback
   * Routes callback to correct shop based on AccountReference or transaction lookup
   */
  async handleCallback(callbackData: any): Promise<{ success: boolean; shopId?: string }> {
    try {
      const stkCallback = callbackData.Body?.stkCallback;
      if (!stkCallback) {
        this.logger.error('Invalid callback format');
        return { success: false };
      }

      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;

      // Find the transaction
      const transaction = await this.transactionModel.findOne({ checkoutRequestId }).exec();
      
      if (!transaction) {
        this.logger.error(`Transaction not found for CheckoutRequestID: ${checkoutRequestId}`);
        return { success: false };
      }

      // Extract callback metadata
      let mpesaReceiptNumber: string | undefined;
      let transactionDate: string | undefined;
      let phoneNumber: string | undefined;

      if (resultCode === 0 && stkCallback.CallbackMetadata?.Item) {
        for (const item of stkCallback.CallbackMetadata.Item) {
          switch (item.Name) {
            case 'MpesaReceiptNumber':
              mpesaReceiptNumber = item.Value;
              break;
            case 'TransactionDate':
              transactionDate = item.Value?.toString();
              break;
            case 'PhoneNumber':
              phoneNumber = item.Value?.toString();
              break;
          }
        }
      }

      // Update transaction
      const status = resultCode === 0 ? 'COMPLETED' : 'FAILED';
      await this.transactionModel.findByIdAndUpdate(transaction._id, {
        status,
        resultCode: resultCode.toString(),
        resultDesc,
        mpesaReceiptNumber,
        completedAt: resultCode === 0 ? new Date() : undefined,
      });

      this.logger.log(`Callback processed for ${checkoutRequestId}: ${status}`);

      return { 
        success: true, 
        shopId: transaction.shopId.toString(),
      };
    } catch (error: any) {
      this.logger.error(`Callback processing error: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Update shop's M-Pesa configuration
   * Encrypts sensitive credentials before storing
   */
  async updateShopMpesaConfig(shopId: string, config: {
    type?: 'paybill' | 'till';
    shortCode?: string;
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
    accountPrefix?: string;
    enabled?: boolean;
  }): Promise<ShopDocument | null> {
    // Encrypt sensitive credentials
    const encryptedConfig = this.encryptionService.encryptMpesaConfig({
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      passkey: config.passkey,
    });

    const updateData: any = {
      'mpesaConfig.type': config.type,
      'mpesaConfig.shortCode': config.shortCode,
      'mpesaConfig.accountPrefix': config.accountPrefix,
      'mpesaConfig.enabled': config.enabled,
      'mpesaConfig.verificationStatus': 'pending',
      'mpesaConfig.updatedAt': new Date(),
    };

    // Add encrypted credentials
    if (config.consumerKey) {
      updateData['mpesaConfig.consumerKey'] = encryptedConfig.consumerKey;
      updateData['mpesaConfig.consumerKeyIv'] = encryptedConfig.consumerKeyIv;
      updateData['mpesaConfig.consumerKeyTag'] = encryptedConfig.consumerKeyTag;
    }

    if (config.consumerSecret) {
      updateData['mpesaConfig.consumerSecret'] = encryptedConfig.consumerSecret;
      updateData['mpesaConfig.consumerSecretIv'] = encryptedConfig.consumerSecretIv;
      updateData['mpesaConfig.consumerSecretTag'] = encryptedConfig.consumerSecretTag;
    }

    if (config.passkey) {
      updateData['mpesaConfig.passkey'] = encryptedConfig.passkey;
      updateData['mpesaConfig.passkeyIv'] = encryptedConfig.passkeyIv;
      updateData['mpesaConfig.passkeyTag'] = encryptedConfig.passkeyTag;
    }

    return this.shopModel.findByIdAndUpdate(
      shopId,
      { $set: updateData },
      { new: true },
    );
  }

  /**
   * Verify shop's M-Pesa credentials by attempting to get an access token
   * Decrypts credentials before verification
   */
  async verifyShopMpesaCredentials(shopId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const shop = await this.shopModel.findById(shopId).exec();
      
      if (!shop?.mpesaConfig?.consumerKey || !shop?.mpesaConfig?.consumerSecret) {
        return { success: false, message: 'M-Pesa credentials not configured' };
      }

      // Decrypt credentials
      const decryptedConfig = this.encryptionService.decryptMpesaConfig(shop.mpesaConfig);

      if (!decryptedConfig.consumerKey || !decryptedConfig.consumerSecret) {
        return { success: false, message: 'Failed to decrypt M-Pesa credentials' };
      }

      // Try to get an access token with decrypted credentials
      await this.getAccessToken(decryptedConfig.consumerKey, decryptedConfig.consumerSecret);

      // Update verification status
      await this.shopModel.findByIdAndUpdate(shopId, {
        $set: {
          'mpesaConfig.verificationStatus': 'verified',
          'mpesaConfig.verifiedAt': new Date(),
          'mpesaConfig.lastTestedAt': new Date(),
          'mpesaConfig.lastTestResult': 'success',
        },
      });

      return { success: true, message: 'M-Pesa credentials verified successfully' };
    } catch (error: any) {
      // Update verification status to failed
      await this.shopModel.findByIdAndUpdate(shopId, {
        $set: {
          'mpesaConfig.verificationStatus': 'failed',
          'mpesaConfig.lastTestedAt': new Date(),
          'mpesaConfig.lastTestResult': 'failed',
        },
      });

      return { success: false, message: `Verification failed: ${error.message}` };
    }
  }

  // Helper methods
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.slice(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private getDefaultCallbackUrl(): string {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:5000');
    return `${baseUrl}/payments/mpesa/callback`;
  }
}
