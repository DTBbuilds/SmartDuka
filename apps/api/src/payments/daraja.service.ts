import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface DarajaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passKey: string;
  environment: 'sandbox' | 'production';
}

export interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaTransaction {
  _id?: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  status: 'pending' | 'completed' | 'failed';
  mpesaReceiptNumber?: string;
  resultCode?: number;
  resultDesc?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DarajaService {
  private readonly logger = new Logger(DarajaService.name);
  private client: AxiosInstance;
  private config: DarajaConfig;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  constructor(private configService: ConfigService) {
    this.config = {
      consumerKey: this.configService.get('MPESA_CONSUMER_KEY', ''),
      consumerSecret: this.configService.get('MPESA_CONSUMER_SECRET', ''),
      shortCode: this.configService.get('MPESA_SHORTCODE', '174379'),
      passKey: this.configService.get('MPESA_PASSKEY', ''),
      environment: (this.configService.get('MPESA_ENV', 'sandbox') as any) || 'sandbox',
    };

    this.client = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: 30000,
    });
  }

  private getBaseUrl(): string {
    return this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(
        `${this.config.consumerKey}:${this.config.consumerSecret}`,
      ).toString('base64');

      const response = await axios.get(
        `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      // Token expires in 3600 seconds, refresh after 3500 seconds
      this.tokenExpiry = Date.now() + 3500 * 1000;

      return this.accessToken;
    } catch (error: any) {
      this.logger.error('Failed to get access token');
      this.logger.error('Error message:', error?.message);
      this.logger.error('Response data:', JSON.stringify(error?.response?.data));
      this.logger.error('Response status:', error?.response?.status);
      this.logger.error('Consumer Key (first 10 chars):', this.config.consumerKey?.substring(0, 10));
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);

      // Validate phone number format (Safaricom: 2547XXXXXXXX or 2541XXXXXXXX)
      if (!/^254[71]\d{8}$/.test(formattedPhone)) {
        throw new Error(`Invalid phone number format: ${formattedPhone}. Must be 2547XXXXXXXX or 2541XXXXXXXX (Safaricom number)`);
      }

      // Validate amount
      if (request.amount < 1 || request.amount > 150000) {
        throw new Error(`Invalid amount: ${request.amount}. Must be between 1 and 150,000 KES`);
      }

      // Validate callback URL
      if (!request.callbackUrl || !request.callbackUrl.startsWith('https://')) {
        this.logger.warn(`Callback URL should be HTTPS: ${request.callbackUrl}`);
      }

      // Check for potentially problematic callback URLs in sandbox
      const isSandbox = this.config.environment === 'sandbox';
      const problematicDomains = ['trycloudflare.com', 'cloudflare', 'workers.dev'];
      const hasProblematicDomain = problematicDomains.some(d => request.callbackUrl.includes(d));
      
      if (isSandbox && hasProblematicDomain) {
        this.logger.warn(
          `Cloudflare tunnel URLs often get rejected by M-Pesa sandbox with "Threat Detected" error. ` +
          `Consider using ngrok instead: ngrok http 5000`
        );
      }

      // Sanitize account reference (max 12 chars, alphanumeric)
      const sanitizedAccountRef = request.accountReference
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 12) || 'Payment';

      // Sanitize transaction description (max 13 chars)
      const sanitizedDesc = request.transactionDesc
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .slice(0, 13) || 'Payment';

      const payload = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: formattedPhone,
        PartyB: this.config.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: request.callbackUrl,
        AccountReference: sanitizedAccountRef,
        TransactionDesc: sanitizedDesc,
      };

      this.logger.log(`STK Push payload: ShortCode=${this.config.shortCode}, Phone=${formattedPhone}, Amount=${payload.Amount}, AccountRef=${sanitizedAccountRef}`);

      const response = await this.client.post('/mpesa/stkpush/v1/processrequest', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log(`STK Push initiated: ${response.data.CheckoutRequestID}`);

      return {
        MerchantRequestID: response.data.MerchantRequestID,
        CheckoutRequestID: response.data.CheckoutRequestID,
        ResponseCode: response.data.ResponseCode,
        ResponseDescription: response.data.ResponseDescription,
        CustomerMessage: response.data.CustomerMessage,
      };
    } catch (error: any) {
      this.logger.error('STK Push failed');
      this.logger.error(error?.response?.data || error?.message);
      
      // Parse specific M-Pesa errors
      const errorData = error?.response?.data;
      let errorMessage = 'Failed to initiate STK push';
      
      if (errorData?.errorCode === '400.002.02') {
        // "Threat Detected" - usually means invalid callback URL or request format
        errorMessage = 'M-Pesa rejected the request. Common causes:\n' +
          '1. Invalid callback URL (must be HTTPS and publicly accessible)\n' +
          '2. Invalid phone number format\n' +
          '3. Special characters in AccountReference or TransactionDesc\n' +
          'For development, use ngrok to expose your local server.';
      } else if (errorData?.errorMessage) {
        errorMessage = errorData.errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async queryStkStatus(
    checkoutRequestId: string,
    merchantRequestId: string,
  ): Promise<{ status: string; resultCode: number; resultDesc: string }> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: this.config.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await this.client.post(
        '/mpesa/stkpushquery/v1/query',
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const resultCode = response.data.ResultCode || 0;
      const status = resultCode === 0 ? 'completed' : 'failed';

      return {
        status,
        resultCode,
        resultDesc: response.data.ResultDesc,
      };
    } catch (error: any) {
      this.logger.error('STK Query failed', error?.response?.data || error?.message);
      throw new Error(
        error?.response?.data?.errorMessage ||
          error?.message ||
          'Failed to query STK status',
      );
    }
  }

  async reverseTransaction(
    receiptNumber: string,
    amount: number,
    reason: string,
  ): Promise<{ reversalId: string; status: string }> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();

      const payload = {
        Initiator: 'testapi',
        SecurityCredential: 'test', // In production, this should be encrypted
        CommandID: 'TransactionReversal',
        TransactionID: receiptNumber,
        Amount: Math.round(amount),
        ReceiverParty: this.config.shortCode,
        RecieverIdentifierType: '4',
        ResultURL: process.env.MPESA_RESULT_URL || 'https://your-domain.com/payments/reversal-result',
        QueueTimeOutURL: process.env.MPESA_TIMEOUT_URL || 'https://your-domain.com/payments/reversal-timeout',
        Remarks: reason,
      };

      const response = await this.client.post(
        '/mpesa/reversal/v1/submit',
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.log(`Transaction reversal initiated: ${receiptNumber}`);

      return {
        reversalId: response.data.ConversationID || '',
        status: response.data.ResponseCode === '0' ? 'pending' : 'failed',
      };
    } catch (error: any) {
      this.logger.error('Transaction reversal failed', error?.response?.data || error?.message);
      throw new Error(
        error?.response?.data?.errorMessage ||
          error?.message ||
          'Failed to reverse transaction',
      );
    }
  }

  validateCallback(signature: string, body: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha256', this.config.passKey)
        .update(body)
        .digest('base64');

      return hash === signature;
    } catch (error) {
      this.logger.error('Callback validation failed', error);
      return false;
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  }

  private generatePassword(timestamp: string): string {
    const data = `${this.config.shortCode}${this.config.passKey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    }

    // If doesn't start with 254, add it
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }
}
