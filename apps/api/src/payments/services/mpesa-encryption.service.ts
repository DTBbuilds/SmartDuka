import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * M-Pesa Credential Encryption Service
 * 
 * Provides AES-256-GCM encryption for sensitive M-Pesa credentials.
 * Used to encrypt/decrypt:
 * - Consumer Key
 * - Consumer Secret
 * - Passkey
 * 
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Random IV for each encryption
 * - Authentication tag to prevent tampering
 */
@Injectable()
export class MpesaEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(MpesaEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private key: Buffer | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeKey();
  }

  /**
   * Initialize encryption key from environment
   */
  private initializeKey(): void {
    const keyHex = this.configService.get<string>('MPESA_ENCRYPTION_KEY');
    
    if (!keyHex) {
      this.logger.warn(
        'MPESA_ENCRYPTION_KEY not set. M-Pesa credentials will be stored in plain text. ' +
        'Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
      this.isConfigured = false;
      return;
    }

    if (keyHex.length !== 64) {
      this.logger.error(
        'MPESA_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
        'Current length: ' + keyHex.length
      );
      this.isConfigured = false;
      return;
    }

    try {
      this.key = Buffer.from(keyHex, 'hex');
      this.isConfigured = true;
      this.logger.log('M-Pesa encryption key initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize encryption key: ' + error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Check if encryption is properly configured
   */
  isEncryptionEnabled(): boolean {
    return this.isConfigured && this.key !== null;
  }

  /**
   * Encrypt a plaintext string
   * 
   * @param plaintext - The string to encrypt
   * @returns Encrypted data with IV and auth tag, or original if encryption disabled
   */
  encrypt(plaintext: string): {
    encrypted: string;
    iv: string;
    tag: string;
    isEncrypted: boolean;
  } {
    if (!this.isEncryptionEnabled() || !this.key) {
      // Return plaintext marker if encryption not configured
      return {
        encrypted: plaintext,
        iv: '',
        tag: '',
        isEncrypted: false,
      };
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        isEncrypted: true,
      };
    } catch (error: any) {
      this.logger.error('Encryption failed: ' + error.message);
      throw new Error('Failed to encrypt credential');
    }
  }

  /**
   * Decrypt an encrypted string
   * 
   * @param encrypted - The encrypted hex string
   * @param iv - The initialization vector (hex)
   * @param tag - The authentication tag (hex)
   * @returns Decrypted plaintext
   */
  decrypt(encrypted: string, iv: string, tag: string): string {
    if (!this.isEncryptionEnabled() || !this.key) {
      // If encryption not configured, assume data is plaintext
      return encrypted;
    }

    if (!iv || !tag) {
      // Data was stored without encryption
      return encrypted;
    }

    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex'),
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      this.logger.error('Decryption failed: ' + error.message);
      throw new Error('Failed to decrypt credential');
    }
  }

  /**
   * Encrypt M-Pesa configuration object
   * Encrypts sensitive fields: consumerKey, consumerSecret, passkey
   */
  encryptMpesaConfig(config: {
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
    [key: string]: any;
  }): {
    consumerKey?: string;
    consumerKeyIv?: string;
    consumerKeyTag?: string;
    consumerSecret?: string;
    consumerSecretIv?: string;
    consumerSecretTag?: string;
    passkey?: string;
    passkeyIv?: string;
    passkeyTag?: string;
    [key: string]: any;
  } {
    const result: any = { ...config };

    if (config.consumerKey) {
      const encrypted = this.encrypt(config.consumerKey);
      result.consumerKey = encrypted.encrypted;
      result.consumerKeyIv = encrypted.iv;
      result.consumerKeyTag = encrypted.tag;
    }

    if (config.consumerSecret) {
      const encrypted = this.encrypt(config.consumerSecret);
      result.consumerSecret = encrypted.encrypted;
      result.consumerSecretIv = encrypted.iv;
      result.consumerSecretTag = encrypted.tag;
    }

    if (config.passkey) {
      const encrypted = this.encrypt(config.passkey);
      result.passkey = encrypted.encrypted;
      result.passkeyIv = encrypted.iv;
      result.passkeyTag = encrypted.tag;
    }

    return result;
  }

  /**
   * Decrypt M-Pesa configuration object
   * Decrypts sensitive fields: consumerKey, consumerSecret, passkey
   */
  decryptMpesaConfig(config: {
    consumerKey?: string;
    consumerKeyIv?: string;
    consumerKeyTag?: string;
    consumerSecret?: string;
    consumerSecretIv?: string;
    consumerSecretTag?: string;
    passkey?: string;
    passkeyIv?: string;
    passkeyTag?: string;
    [key: string]: any;
  }): {
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
    [key: string]: any;
  } {
    const result: any = { ...config };

    // Remove IV and tag fields from result
    delete result.consumerKeyIv;
    delete result.consumerKeyTag;
    delete result.consumerSecretIv;
    delete result.consumerSecretTag;
    delete result.passkeyIv;
    delete result.passkeyTag;

    if (config.consumerKey && config.consumerKeyIv && config.consumerKeyTag) {
      result.consumerKey = this.decrypt(
        config.consumerKey,
        config.consumerKeyIv,
        config.consumerKeyTag,
      );
    }

    if (config.consumerSecret && config.consumerSecretIv && config.consumerSecretTag) {
      result.consumerSecret = this.decrypt(
        config.consumerSecret,
        config.consumerSecretIv,
        config.consumerSecretTag,
      );
    }

    if (config.passkey && config.passkeyIv && config.passkeyTag) {
      result.passkey = this.decrypt(
        config.passkey,
        config.passkeyIv,
        config.passkeyTag,
      );
    }

    return result;
  }

  /**
   * Generate a new encryption key (for setup)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mask a credential for display (show first 4 and last 4 chars)
   */
  maskCredential(credential: string): string {
    if (!credential || credential.length < 10) {
      return '****';
    }
    return `${credential.slice(0, 4)}${'*'.repeat(credential.length - 8)}${credential.slice(-4)}`;
  }
}
