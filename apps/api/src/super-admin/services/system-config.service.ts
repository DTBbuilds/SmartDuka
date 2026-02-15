import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemConfig, SystemConfigDocument, SystemConfigType } from '../schemas/system-config.schema';
import { MpesaEncryptionService } from '../../payments/services/mpesa-encryption.service';

/**
 * System Configuration Service
 * 
 * Manages system-wide configurations that super admin can control.
 * Handles encryption/decryption of sensitive credentials.
 */
@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectModel(SystemConfig.name)
    private readonly configModel: Model<SystemConfigDocument>,
    private readonly encryptionService: MpesaEncryptionService,
  ) {}

  /**
   * Get all system configurations
   */
  async getAllConfigs(): Promise<SystemConfigDocument[]> {
    return this.configModel.find().sort({ type: 1 });
  }

  /**
   * Get configuration by type
   */
  async getConfigByType(type: SystemConfigType): Promise<SystemConfigDocument | null> {
    return this.configModel.findOne({ type });
  }

  /**
   * Get M-Pesa configuration (decrypted)
   */
  async getMpesaConfig(): Promise<{
    isConfigured: boolean;
    isActive: boolean;
    environment: string;
    shortCode?: string;
    callbackUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
  }> {
    const config = await this.configModel.findOne({ type: SystemConfigType.MPESA });
    
    if (!config) {
      return {
        isConfigured: false,
        isActive: false,
        environment: 'sandbox',
      };
    }

    // Decrypt credentials
    let consumerKey = '';
    let consumerSecret = '';
    let passkey = '';

    try {
      if (config.config.consumerKey && config.config.consumerKeyIv && config.config.consumerKeyTag) {
        consumerKey = this.encryptionService.decrypt(
          config.config.consumerKey,
          config.config.consumerKeyIv,
          config.config.consumerKeyTag,
        );
      }
      if (config.config.consumerSecret && config.config.consumerSecretIv && config.config.consumerSecretTag) {
        consumerSecret = this.encryptionService.decrypt(
          config.config.consumerSecret,
          config.config.consumerSecretIv,
          config.config.consumerSecretTag,
        );
      }
      if (config.config.passkey && config.config.passkeyIv && config.config.passkeyTag) {
        passkey = this.encryptionService.decrypt(
          config.config.passkey,
          config.config.passkeyIv,
          config.config.passkeyTag,
        );
      }
    } catch (error) {
      this.logger.error('Failed to decrypt M-Pesa credentials', error);
    }

    return {
      isConfigured: !!(consumerKey && consumerSecret && passkey),
      isActive: config.isActive,
      environment: config.environment,
      shortCode: config.config.shortCode,
      callbackUrl: config.config.callbackUrl,
      consumerKey,
      consumerSecret,
      passkey,
    };
  }

  /**
   * Save M-Pesa configuration
   */
  async saveMpesaConfig(data: {
    environment: 'sandbox' | 'production';
    shortCode: string;
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    callbackUrl?: string;
    isActive?: boolean;
    updatedBy?: string;
    updatedByEmail?: string;
  }): Promise<SystemConfigDocument> {
    // Encrypt credentials
    const encryptedConsumerKey = this.encryptionService.encrypt(data.consumerKey);
    const encryptedConsumerSecret = this.encryptionService.encrypt(data.consumerSecret);
    const encryptedPasskey = this.encryptionService.encrypt(data.passkey);

    const configData = {
      type: SystemConfigType.MPESA,
      name: 'M-Pesa STK Push Configuration',
      description: 'System M-Pesa credentials for subscription payments',
      isActive: data.isActive ?? true,
      environment: data.environment,
      config: {
        shortCode: data.shortCode,
        callbackUrl: data.callbackUrl || '',
        consumerKey: encryptedConsumerKey.encrypted,
        consumerKeyIv: encryptedConsumerKey.iv,
        consumerKeyTag: encryptedConsumerKey.tag,
        consumerSecret: encryptedConsumerSecret.encrypted,
        consumerSecretIv: encryptedConsumerSecret.iv,
        consumerSecretTag: encryptedConsumerSecret.tag,
        passkey: encryptedPasskey.encrypted,
        passkeyIv: encryptedPasskey.iv,
        passkeyTag: encryptedPasskey.tag,
      },
      updatedByEmail: data.updatedByEmail,
    };

    const result = await this.configModel.findOneAndUpdate(
      { type: SystemConfigType.MPESA },
      { $set: configData },
      { upsert: true, new: true },
    );

    this.logger.log(`M-Pesa configuration saved by ${data.updatedByEmail}`);
    return result;
  }

  /**
   * Test M-Pesa configuration
   */
  async testMpesaConfig(): Promise<{ success: boolean; message: string; error?: string }> {
    const config = await this.getMpesaConfig();

    if (!config.isConfigured) {
      return {
        success: false,
        message: 'M-Pesa is not configured',
        error: 'NOT_CONFIGURED',
      };
    }

    try {
      // Test by getting access token
      const axios = require('axios');
      const baseUrl = config.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

      const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
      
      const response = await axios.get(
        `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
          timeout: 10000,
        },
      );

      if (response.data.access_token) {
        // Update test result
        await this.configModel.findOneAndUpdate(
          { type: SystemConfigType.MPESA },
          {
            $set: {
              lastTestedAt: new Date(),
              lastTestResult: 'success',
              lastTestError: null,
            },
          },
        );

        return {
          success: true,
          message: 'M-Pesa credentials are valid',
        };
      }

      throw new Error('No access token received');
    } catch (error: any) {
      const errorMessage = error.response?.data?.errorMessage || error.message || 'Unknown error';
      
      // Update test result
      await this.configModel.findOneAndUpdate(
        { type: SystemConfigType.MPESA },
        {
          $set: {
            lastTestedAt: new Date(),
            lastTestResult: 'failed',
            lastTestError: errorMessage,
          },
        },
      );

      return {
        success: false,
        message: 'M-Pesa credentials are invalid',
        error: errorMessage,
      };
    }
  }

  /**
   * Toggle M-Pesa configuration active status
   */
  async toggleMpesaActive(isActive: boolean): Promise<SystemConfigDocument | null> {
    return this.configModel.findOneAndUpdate(
      { type: SystemConfigType.MPESA },
      { $set: { isActive } },
      { new: true },
    );
  }

  /**
   * Get M-Pesa config for display (masked credentials)
   */
  async getMpesaConfigForDisplay(): Promise<{
    isConfigured: boolean;
    isActive: boolean;
    environment: string;
    shortCode?: string;
    callbackUrl?: string;
    consumerKeyMasked?: string;
    consumerSecretMasked?: string;
    passkeyMasked?: string;
    lastTestedAt?: Date;
    lastTestResult?: string;
    lastTestError?: string;
  }> {
    const config = await this.configModel.findOne({ type: SystemConfigType.MPESA });
    
    if (!config) {
      return {
        isConfigured: false,
        isActive: false,
        environment: 'sandbox',
      };
    }

    // Get decrypted config to check if configured
    const decrypted = await this.getMpesaConfig();

    return {
      isConfigured: decrypted.isConfigured,
      isActive: config.isActive,
      environment: config.environment,
      shortCode: config.config.shortCode,
      callbackUrl: config.config.callbackUrl,
      consumerKeyMasked: decrypted.consumerKey ? this.maskString(decrypted.consumerKey) : undefined,
      consumerSecretMasked: decrypted.consumerSecret ? this.maskString(decrypted.consumerSecret) : undefined,
      passkeyMasked: decrypted.passkey ? this.maskString(decrypted.passkey) : undefined,
      lastTestedAt: config.lastTestedAt,
      lastTestResult: config.lastTestResult,
      lastTestError: config.lastTestError,
    };
  }

  private maskString(str: string): string {
    if (str.length <= 8) return '****';
    return str.substring(0, 4) + '****' + str.substring(str.length - 4);
  }

  /**
   * Get VAT configuration
   * Returns VAT settings for subscription/invoice calculations
   */
  async getVatConfig(): Promise<{
    enabled: boolean;
    rate: number;
    name: string;
    description: string;
  }> {
    const config = await this.configModel.findOne({ type: SystemConfigType.VAT });
    
    // Default: VAT disabled
    if (!config) {
      return {
        enabled: false,
        rate: 0.16,
        name: 'VAT',
        description: 'Value Added Tax (16%)',
      };
    }

    return {
      enabled: config.config.vatEnabled ?? false,
      rate: config.config.vatRate ?? 0.16,
      name: config.config.vatName ?? 'VAT',
      description: config.config.vatDescription ?? 'Value Added Tax (16%)',
    };
  }

  /**
   * Save VAT configuration
   */
  async saveVatConfig(data: {
    enabled: boolean;
    rate?: number;
    name?: string;
    description?: string;
    updatedByEmail?: string;
  }): Promise<SystemConfigDocument> {
    const configData = {
      type: SystemConfigType.VAT,
      name: 'VAT Configuration',
      description: 'System-wide VAT settings for subscription payments and invoices',
      isActive: data.enabled,
      environment: 'production' as const,
      config: {
        vatEnabled: data.enabled,
        vatRate: data.rate ?? 0.16,
        vatName: data.name ?? 'VAT',
        vatDescription: data.description ?? 'Value Added Tax (16%)',
      },
      updatedByEmail: data.updatedByEmail,
    };

    const result = await this.configModel.findOneAndUpdate(
      { type: SystemConfigType.VAT },
      { $set: configData },
      { upsert: true, new: true },
    );

    this.logger.log(`VAT configuration saved: enabled=${data.enabled}, rate=${data.rate ?? 0.16}`);
    return result;
  }

  /**
   * Toggle VAT enabled/disabled
   */
  async toggleVatEnabled(enabled: boolean, updatedByEmail?: string): Promise<SystemConfigDocument | null> {
    const existing = await this.configModel.findOne({ type: SystemConfigType.VAT });
    
    if (!existing) {
      // Create new config with default values
      return this.saveVatConfig({ enabled, updatedByEmail });
    }

    return this.configModel.findOneAndUpdate(
      { type: SystemConfigType.VAT },
      { 
        $set: { 
          isActive: enabled,
          'config.vatEnabled': enabled,
          updatedByEmail,
        } 
      },
      { new: true },
    );
  }
}
