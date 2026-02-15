import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  PaymentConfig,
  PaymentConfigDocument,
  PaymentProvider,
  ConfigEnvironment,
  ConfigStatus,
} from '../schemas/payment-config.schema';
import {
  VerificationLog,
  VerificationLogDocument,
  VerificationType,
  VerificationResult,
} from '../schemas/verification-log.schema';
import {
  ConfigAuditLog,
  ConfigAuditLogDocument,
  AuditAction,
  FieldChange,
  createMaskedSnapshot,
  maskSensitiveValue,
} from '../schemas/config-audit-log.schema';
import { MpesaEncryptionService } from './mpesa-encryption.service';

/**
 * Decrypted credentials interface
 */
export interface DecryptedCredentials {
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Active till response
 */
export interface ActiveTillResponse {
  config: PaymentConfigDocument;
  decryptedCredentials: DecryptedCredentials;
  source: 'branch' | 'shop';
}

/**
 * Create config DTO
 */
export interface CreatePaymentConfigDto {
  name: string;
  provider: PaymentProvider;
  environment: ConfigEnvironment;
  shortCode: string;
  accountPrefix?: string;
  branchId?: string;
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  callbackUrl?: string;
  priority?: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  metadata?: Record<string, any>;
}

/**
 * Update config DTO
 */
export interface UpdatePaymentConfigDto {
  name?: string;
  shortCode?: string;
  accountPrefix?: string;
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  callbackUrl?: string;
  priority?: number;
  minAmount?: number;
  maxAmount?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  metadata?: Record<string, any>;
}

/**
 * Payment Configuration Service
 * 
 * Handles:
 * - CRUD operations for payment configurations
 * - Runtime till resolution with failover
 * - Credential encryption/decryption
 * - Verification workflow
 * - Audit logging
 * - Till uniqueness validation
 */
@Injectable()
export class PaymentConfigService {
  private readonly logger = new Logger(PaymentConfigService.name);

  constructor(
    @InjectModel(PaymentConfig.name)
    private readonly configModel: Model<PaymentConfigDocument>,
    @InjectModel(VerificationLog.name)
    private readonly verificationLogModel: Model<VerificationLogDocument>,
    @InjectModel(ConfigAuditLog.name)
    private readonly auditLogModel: Model<ConfigAuditLogDocument>,
    private readonly configService: ConfigService,
    private readonly encryptionService: MpesaEncryptionService,
  ) {}

  // ============================================
  // RUNTIME RESOLUTION - CORE FUNCTION
  // ============================================

  /**
   * Get the active payment configuration for a tenant
   * 
   * Resolution order:
   * 1. Branch-specific config (if branchId provided)
   * 2. Shop-level config
   * 3. Failover to next priority if primary fails
   * 
   * @param shopId - The tenant's shop ID
   * @param provider - Payment provider (e.g., MPESA_TILL)
   * @param branchId - Optional branch ID for branch-level config
   * @param environment - Sandbox or Production (defaults to env setting)
   */
  async getActiveTill(
    shopId: string,
    provider: PaymentProvider,
    branchId?: string,
    environment?: ConfigEnvironment,
  ): Promise<ActiveTillResponse> {
    const env = environment || this.getDefaultEnvironment();

    this.logger.debug(
      `Resolving active till for shop=${shopId}, provider=${provider}, branch=${branchId}, env=${env}`
    );

    // Step 1: Try branch-specific config first
    if (branchId) {
      const branchConfig = await this.findActiveConfig(shopId, provider, env, branchId);
      if (branchConfig) {
        this.logger.log(`Using branch-level config for shop ${shopId}, branch ${branchId}`);
        return {
          ...await this.prepareConfigResponse(branchConfig),
          source: 'branch',
        };
      }
    }

    // Step 2: Fall back to shop-level config
    const shopConfig = await this.findActiveConfig(shopId, provider, env);
    if (shopConfig) {
      this.logger.log(`Using shop-level config for shop ${shopId}`);
      return {
        ...await this.prepareConfigResponse(shopConfig),
        source: 'shop',
      };
    }

    // Step 3: No config found
    throw new BadRequestException(
      `No active ${provider} configuration found for this shop. ` +
      `Please configure your payment settings in Settings → M-Pesa.`
    );
  }

  /**
   * Find active config with failover support
   */
  private async findActiveConfig(
    shopId: string,
    provider: PaymentProvider,
    environment: ConfigEnvironment,
    branchId?: string,
  ): Promise<PaymentConfigDocument | null> {
    const query: any = {
      shopId: new Types.ObjectId(shopId),
      provider,
      environment,
      status: ConfigStatus.VERIFIED,
      isActive: true,
    };

    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    } else {
      // Shop-level config has no branchId
      query.branchId = { $exists: false };
    }

    // Get all matching configs sorted by priority (lower = higher priority)
    const configs = await this.configModel
      .find(query)
      .sort({ isDefault: -1, priority: 1 })
      .exec();

    if (configs.length === 0) {
      return null;
    }

    // Return the highest priority config
    return configs[0];
  }

  /**
   * Prepare config response with decrypted credentials
   */
  private async prepareConfigResponse(
    config: PaymentConfigDocument
  ): Promise<{ config: PaymentConfigDocument; decryptedCredentials: DecryptedCredentials }> {
    const decrypted = this.encryptionService.decryptMpesaConfig(config.credentials);

    return {
      config,
      decryptedCredentials: {
        consumerKey: decrypted.consumerKey,
        consumerSecret: decrypted.consumerSecret,
        passkey: decrypted.passkey,
      },
    };
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * List all payment configs for a shop
   */
  async listConfigs(
    shopId: string,
    filters?: {
      provider?: PaymentProvider;
      environment?: ConfigEnvironment;
      status?: ConfigStatus;
      branchId?: string;
      isActive?: boolean;
    }
  ): Promise<PaymentConfigDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.provider) query.provider = filters.provider;
    if (filters?.environment) query.environment = filters.environment;
    if (filters?.status) query.status = filters.status;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;
    if (filters?.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
    }

    return this.configModel
      .find(query)
      .sort({ provider: 1, environment: 1, priority: 1 })
      .exec();
  }

  /**
   * Get a specific config by ID
   */
  async getConfig(shopId: string, configId: string): Promise<PaymentConfigDocument> {
    const config = await this.configModel.findOne({
      _id: new Types.ObjectId(configId),
      shopId: new Types.ObjectId(shopId),
    }).exec();

    if (!config) {
      throw new NotFoundException('Payment configuration not found');
    }

    return config;
  }

  /**
   * Create a new payment configuration
   */
  async createConfig(
    shopId: string,
    userId: string,
    dto: CreatePaymentConfigDto,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<PaymentConfigDocument> {
    // Validate uniqueness
    const uniqueness = await this.validateTillUniqueness(
      shopId,
      dto.shortCode,
      dto.provider,
      dto.environment,
      dto.branchId
    );

    if (!uniqueness.isUnique) {
      throw new BadRequestException(
        `This ${dto.provider} short code (${dto.shortCode}) is already configured. ` +
        `Each till/paybill can only be used once per environment.`
      );
    }

    // Encrypt credentials
    const encryptedCredentials = this.encryptionService.encryptMpesaConfig({
      consumerKey: dto.consumerKey,
      consumerSecret: dto.consumerSecret,
      passkey: dto.passkey,
    });

    // Create config
    const config = new this.configModel({
      shopId: new Types.ObjectId(shopId),
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
      provider: dto.provider,
      environment: dto.environment,
      name: dto.name,
      shortCode: dto.shortCode,
      accountPrefix: dto.accountPrefix,
      credentials: encryptedCredentials,
      callbackUrl: dto.callbackUrl || this.getDefaultCallbackUrl(),
      status: ConfigStatus.DRAFT,
      priority: dto.priority ?? 0,
      isActive: false,
      isDefault: false,
      minAmount: dto.minAmount,
      maxAmount: dto.maxAmount,
      dailyLimit: dto.dailyLimit,
      monthlyLimit: dto.monthlyLimit,
      metadata: dto.metadata,
      createdBy: new Types.ObjectId(userId),
      version: 1,
    });

    await config.save();

    // Create audit log
    await this.createAuditLog({
      configId: config._id,
      shopId,
      branchId: dto.branchId,
      action: AuditAction.CREATE,
      description: `Created ${dto.provider} configuration "${dto.name}"`,
      newState: createMaskedSnapshot(config.toObject()),
      performedBy: userId,
      ...requestInfo,
      provider: dto.provider,
      environment: dto.environment,
      configName: dto.name,
      shortCode: dto.shortCode,
      configVersion: 1,
    });

    this.logger.log(`Created payment config ${config._id} for shop ${shopId}`);

    return config;
  }

  /**
   * Update a payment configuration
   */
  async updateConfig(
    shopId: string,
    configId: string,
    userId: string,
    dto: UpdatePaymentConfigDto,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<PaymentConfigDocument> {
    const config = await this.getConfig(shopId, configId);
    const previousState = createMaskedSnapshot(config.toObject());
    const changes: FieldChange[] = [];

    // Track changes
    if (dto.name && dto.name !== config.name) {
      changes.push({ field: 'name', oldValue: config.name, newValue: dto.name });
      config.name = dto.name;
    }

    if (dto.shortCode && dto.shortCode !== config.shortCode) {
      // Validate uniqueness for new short code
      const uniqueness = await this.validateTillUniqueness(
        shopId,
        dto.shortCode,
        config.provider,
        config.environment,
        config.branchId?.toString(),
        configId
      );

      if (!uniqueness.isUnique) {
        throw new BadRequestException(
          `This short code (${dto.shortCode}) is already in use.`
        );
      }

      changes.push({ field: 'shortCode', oldValue: config.shortCode, newValue: dto.shortCode });
      config.shortCode = dto.shortCode;
    }

    if (dto.accountPrefix !== undefined) {
      changes.push({ field: 'accountPrefix', oldValue: config.accountPrefix, newValue: dto.accountPrefix });
      config.accountPrefix = dto.accountPrefix;
    }

    if (dto.callbackUrl !== undefined) {
      changes.push({ field: 'callbackUrl', oldValue: config.callbackUrl, newValue: dto.callbackUrl });
      config.callbackUrl = dto.callbackUrl;
    }

    if (dto.priority !== undefined) {
      changes.push({ field: 'priority', oldValue: config.priority, newValue: dto.priority });
      config.priority = dto.priority;
    }

    // Handle credential updates
    let credentialsUpdated = false;
    if (dto.consumerKey || dto.consumerSecret || dto.passkey) {
      const currentDecrypted = this.encryptionService.decryptMpesaConfig(config.credentials);

      const newCredentials = {
        consumerKey: dto.consumerKey || currentDecrypted.consumerKey,
        consumerSecret: dto.consumerSecret || currentDecrypted.consumerSecret,
        passkey: dto.passkey || currentDecrypted.passkey,
      };

      const encrypted = this.encryptionService.encryptMpesaConfig(newCredentials);
      config.credentials = encrypted;
      credentialsUpdated = true;

      if (dto.consumerKey) {
        changes.push({
          field: 'consumerKey',
          oldValue: maskSensitiveValue(currentDecrypted.consumerKey, 'consumerKey'),
          newValue: maskSensitiveValue(dto.consumerKey, 'consumerKey'),
          isSensitive: true,
        });
      }
      if (dto.consumerSecret) {
        changes.push({
          field: 'consumerSecret',
          oldValue: '********',
          newValue: '********',
          isSensitive: true,
        });
      }
      if (dto.passkey) {
        changes.push({
          field: 'passkey',
          oldValue: '********',
          newValue: '********',
          isSensitive: true,
        });
      }

      // Reset verification status when credentials change
      config.status = ConfigStatus.DRAFT;
      config.verifiedAt = undefined;
      config.verifiedBy = undefined;
    }

    // Update limits
    if (dto.minAmount !== undefined) config.minAmount = dto.minAmount;
    if (dto.maxAmount !== undefined) config.maxAmount = dto.maxAmount;
    if (dto.dailyLimit !== undefined) config.dailyLimit = dto.dailyLimit;
    if (dto.monthlyLimit !== undefined) config.monthlyLimit = dto.monthlyLimit;
    if (dto.metadata) config.metadata = { ...config.metadata, ...dto.metadata };

    config.updatedBy = new Types.ObjectId(userId);
    config.version += 1;

    await config.save();

    // Create audit log
    await this.createAuditLog({
      configId: config._id,
      shopId,
      branchId: config.branchId?.toString(),
      action: AuditAction.UPDATE,
      description: `Updated ${config.provider} configuration "${config.name}"`,
      changes,
      previousState,
      newState: createMaskedSnapshot(config.toObject()),
      performedBy: userId,
      ...requestInfo,
      provider: config.provider,
      environment: config.environment,
      configName: config.name,
      shortCode: config.shortCode,
      configVersion: config.version,
    });

    this.logger.log(`Updated payment config ${configId} for shop ${shopId}`);

    return config;
  }

  /**
   * Delete a payment configuration
   */
  async deleteConfig(
    shopId: string,
    configId: string,
    userId: string,
    reason?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const config = await this.getConfig(shopId, configId);

    if (config.isActive) {
      throw new BadRequestException(
        'Cannot delete an active configuration. Please deactivate it first.'
      );
    }

    const previousState = createMaskedSnapshot(config.toObject());

    await this.configModel.deleteOne({ _id: config._id }).exec();

    // Create audit log
    await this.createAuditLog({
      configId: config._id,
      shopId,
      branchId: config.branchId?.toString(),
      action: AuditAction.DELETE,
      description: `Deleted ${config.provider} configuration "${config.name}"`,
      previousState,
      performedBy: userId,
      reason,
      ...requestInfo,
      provider: config.provider,
      environment: config.environment,
      configName: config.name,
      shortCode: config.shortCode,
    });

    this.logger.log(`Deleted payment config ${configId} for shop ${shopId}`);
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Activate a payment configuration
   */
  async activateConfig(
    shopId: string,
    configId: string,
    userId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<PaymentConfigDocument> {
    const config = await this.getConfig(shopId, configId);

    if (config.status !== ConfigStatus.VERIFIED) {
      throw new BadRequestException(
        'Configuration must be verified before activation. Please verify your credentials first.'
      );
    }

    if (config.isActive) {
      return config; // Already active
    }

    config.isActive = true;
    config.updatedBy = new Types.ObjectId(userId);
    await config.save();

    await this.createAuditLog({
      configId: config._id,
      shopId,
      action: AuditAction.ACTIVATE,
      description: `Activated ${config.provider} configuration "${config.name}"`,
      performedBy: userId,
      ...requestInfo,
      provider: config.provider,
      configName: config.name,
      shortCode: config.shortCode,
    });

    this.logger.log(`Activated payment config ${configId} for shop ${shopId}`);

    return config;
  }

  /**
   * Deactivate a payment configuration
   */
  async deactivateConfig(
    shopId: string,
    configId: string,
    userId: string,
    reason?: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<PaymentConfigDocument> {
    const config = await this.getConfig(shopId, configId);

    if (!config.isActive) {
      return config; // Already inactive
    }

    config.isActive = false;
    config.updatedBy = new Types.ObjectId(userId);
    await config.save();

    await this.createAuditLog({
      configId: config._id,
      shopId,
      action: AuditAction.DEACTIVATE,
      description: `Deactivated ${config.provider} configuration "${config.name}"`,
      performedBy: userId,
      reason,
      ...requestInfo,
      provider: config.provider,
      configName: config.name,
      shortCode: config.shortCode,
    });

    this.logger.log(`Deactivated payment config ${configId} for shop ${shopId}`);

    return config;
  }

  /**
   * Set a config as the default for its provider
   */
  async setDefaultConfig(
    shopId: string,
    configId: string,
    userId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<PaymentConfigDocument> {
    const config = await this.getConfig(shopId, configId);

    // Remove default from other configs of same provider/environment
    await this.configModel.updateMany(
      {
        shopId: new Types.ObjectId(shopId),
        provider: config.provider,
        environment: config.environment,
        branchId: config.branchId,
        _id: { $ne: config._id },
      },
      { $set: { isDefault: false } }
    ).exec();

    config.isDefault = true;
    config.updatedBy = new Types.ObjectId(userId);
    await config.save();

    await this.createAuditLog({
      configId: config._id,
      shopId,
      action: AuditAction.SET_DEFAULT,
      description: `Set ${config.provider} configuration "${config.name}" as default`,
      performedBy: userId,
      ...requestInfo,
      provider: config.provider,
      configName: config.name,
      shortCode: config.shortCode,
    });

    return config;
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate till uniqueness before registration
   */
  async validateTillUniqueness(
    shopId: string,
    shortCode: string,
    provider: PaymentProvider,
    environment: ConfigEnvironment,
    branchId?: string,
    excludeConfigId?: string,
  ): Promise<{ isUnique: boolean; conflictingConfig?: PaymentConfigDocument }> {
    const query: any = {
      shortCode,
      provider,
      environment,
    };

    if (excludeConfigId) {
      query._id = { $ne: new Types.ObjectId(excludeConfigId) };
    }

    // Check if same till is used by same shop for same branch
    const sameShopQuery: any = {
      ...query,
      shopId: new Types.ObjectId(shopId),
    };

    if (branchId) {
      sameShopQuery.branchId = new Types.ObjectId(branchId);
    } else {
      sameShopQuery.branchId = { $exists: false };
    }

    const sameShopConfig = await this.configModel.findOne(sameShopQuery).exec();

    if (sameShopConfig) {
      return {
        isUnique: false,
        conflictingConfig: sameShopConfig,
      };
    }

    // Check if till is used by different shop (not allowed by default)
    const otherShopConfig = await this.configModel.findOne({
      ...query,
      shopId: { $ne: new Types.ObjectId(shopId) },
    }).exec();

    if (otherShopConfig) {
      return {
        isUnique: false,
        conflictingConfig: otherShopConfig,
      };
    }

    return { isUnique: true };
  }

  // ============================================
  // FAILOVER
  // ============================================

  /**
   * Get next available config for failover
   */
  async getFailoverConfig(
    shopId: string,
    provider: PaymentProvider,
    environment: ConfigEnvironment,
    excludeConfigId: string,
    branchId?: string,
  ): Promise<PaymentConfigDocument | null> {
    const query: any = {
      shopId: new Types.ObjectId(shopId),
      provider,
      environment,
      status: ConfigStatus.VERIFIED,
      isActive: true,
      _id: { $ne: new Types.ObjectId(excludeConfigId) },
    };

    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    } else {
      query.branchId = { $exists: false };
    }

    return this.configModel
      .findOne(query)
      .sort({ priority: 1 })
      .exec();
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  /**
   * Create an audit log entry
   */
  private async createAuditLog(data: {
    configId: Types.ObjectId;
    shopId: string;
    branchId?: string;
    action: AuditAction;
    description?: string;
    changes?: FieldChange[];
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
    performedBy: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    provider?: string;
    environment?: string;
    configName?: string;
    shortCode?: string;
    configVersion?: number;
  }): Promise<void> {
    const auditLog = new this.auditLogModel({
      configId: data.configId,
      shopId: new Types.ObjectId(data.shopId),
      branchId: data.branchId ? new Types.ObjectId(data.branchId) : undefined,
      action: data.action,
      description: data.description,
      changes: data.changes || [],
      previousState: data.previousState,
      newState: data.newState,
      performedBy: new Types.ObjectId(data.performedBy),
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      provider: data.provider,
      environment: data.environment,
      configName: data.configName,
      shortCode: data.shortCode,
      configVersion: data.configVersion,
    });

    await auditLog.save();
  }

  /**
   * Get audit logs for a config
   */
  async getAuditLogs(
    shopId: string,
    configId?: string,
    limit = 50
  ): Promise<ConfigAuditLogDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };
    if (configId) {
      query.configId = new Types.ObjectId(configId);
    }

    return this.auditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'name email')
      .exec();
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get default environment from config
   */
  private getDefaultEnvironment(): ConfigEnvironment {
    const env = this.configService.get<string>('MPESA_ENV', 'sandbox');
    return env === 'production'
      ? ConfigEnvironment.PRODUCTION
      : ConfigEnvironment.SANDBOX;
  }

  /**
   * Get default callback URL
   */
  private getDefaultCallbackUrl(): string {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3001');
    return `${baseUrl}/api/payments/mpesa/callback`;
  }

  /**
   * Update transaction stats for a config
   */
  async updateTransactionStats(
    configId: string,
    success: boolean
  ): Promise<void> {
    const update: any = {
      $inc: { totalTransactions: 1 },
      $set: { lastUsedAt: new Date() },
    };

    if (success) {
      update.$inc.successfulTransactions = 1;
    } else {
      update.$inc.failedTransactions = 1;
    }

    await this.configModel.updateOne(
      { _id: new Types.ObjectId(configId) },
      update
    ).exec();
  }
}
