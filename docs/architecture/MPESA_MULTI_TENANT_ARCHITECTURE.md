# Multi-Tenant M-Pesa Architecture

## Complete Design Document for SmartDuka

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Gap Analysis](#gap-analysis)
4. [Enhanced Architecture Design](#enhanced-architecture-design)
5. [Database Schemas](#database-schemas)
6. [Entity Relationship Diagram](#entity-relationship-diagram)
7. [API Design](#api-design)
8. [Security Model](#security-model)
9. [Workflow Diagrams](#workflow-diagrams)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document outlines the complete architecture for handling multi-tenant payment configurations in SmartDuka, supporting:

- **Multiple payment providers**: M-Pesa (Paybill/Till), Airtel Money, Bank transfers
- **Multi-branch merchants**: Each branch can have its own till
- **Sandbox/Production environments**: Separate credentials per environment
- **Failover support**: Multiple tills with priority-based selection
- **Audit logging**: Complete trail of all configuration changes
- **Till rotation**: Version history and scheduled credential rotation

---

## Current System Analysis

### What You Have ✅

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌─────────────────────────────────┐      │
│  │    Shop      │────▶│       mpesaConfig (embedded)    │      │
│  │   Schema     │     │  - type (paybill/till)          │      │
│  └──────────────┘     │  - shortCode                    │      │
│                       │  - consumerKey (encrypted)      │      │
│                       │  - consumerSecret (encrypted)   │      │
│                       │  - passkey (encrypted)          │      │
│                       │  - enabled                      │      │
│                       │  - verificationStatus           │      │
│                       └─────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────┐     ┌─────────────────────────────────┐      │
│  │   Branch     │     │  (No payment config)            │      │
│  │   Schema     │     │                                 │      │
│  └──────────────┘     └─────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              MpesaMultiTenantService                 │      │
│  │  - getShopMpesaConfig(shopId)                        │      │
│  │  - initiateSTKPush(params)                           │      │
│  │  - verifyShopMpesaCredentials(shopId)                │      │
│  │  - getMpesaConfigStatus(shopId)                      │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  Security:                                                      │
│  ✅ AES-256-GCM encryption for credentials                     │
│  ✅ Shop-level isolation                                        │
│  ✅ No fallback to platform credentials                         │
│  ✅ Verification status tracking                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Current Strengths

| Feature | Status | Notes |
|---------|--------|-------|
| Shop-specific M-Pesa config | ✅ Complete | Embedded in Shop schema |
| Credential encryption | ✅ Complete | AES-256-GCM with IV and auth tag |
| Verification workflow | ✅ Complete | pending/verified/failed states |
| No platform fallback | ✅ Complete | Each shop must configure own credentials |
| STK Push integration | ✅ Complete | Full Daraja API integration |
| Transaction tracking | ✅ Complete | MpesaTransaction schema with state machine |
| Multi-tenant isolation | ✅ Complete | shopId on all transactions |

---

## Gap Analysis

### What's Missing ❌

| Requirement | Current Status | Priority | Effort |
|-------------|----------------|----------|--------|
| **Multiple tills per shop** | ❌ Single config only | High | Medium |
| **Branch-level tills** | ❌ Not supported | High | Medium |
| **Multiple providers** | ❌ M-Pesa only | Medium | High |
| **Sandbox/Production separation** | ⚠️ Global env only | High | Low |
| **Till uniqueness validation** | ❌ No validation | Medium | Low |
| **Failover/priority tills** | ❌ Not supported | Medium | Medium |
| **Audit logging for config changes** | ❌ Not implemented | High | Low |
| **Till rotation/versioning** | ❌ Not supported | Low | Medium |
| **Verification logs** | ❌ Not tracked | Medium | Low |

### Comparison Matrix

```
┌────────────────────────────────┬──────────────┬──────────────────┐
│         FEATURE                │   CURRENT    │   RECOMMENDED    │
├────────────────────────────────┼──────────────┼──────────────────┤
│ Payment configs per shop       │      1       │    Unlimited     │
│ Providers supported            │   M-Pesa     │ M-Pesa, Airtel,  │
│                                │              │ Bank, Card       │
│ Branch-level configs           │     No       │      Yes         │
│ Environment separation         │   Global     │   Per-config     │
│ Till uniqueness check          │     No       │      Yes         │
│ Failover support               │     No       │      Yes         │
│ Audit trail                    │     No       │      Yes         │
│ Version history                │     No       │      Yes         │
│ Verification logs              │     No       │      Yes         │
│ Scheduled rotation             │     No       │      Yes         │
└────────────────────────────────┴──────────────┴──────────────────┘
```

---

## Enhanced Architecture Design

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ENHANCED ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐                                                           │
│  │    Shop      │──────────────────────────────────────┐                    │
│  │  (Tenant)    │                                      │                    │
│  └──────────────┘                                      │                    │
│         │                                              │                    │
│         │ 1:N                                          │ 1:N                │
│         ▼                                              ▼                    │
│  ┌──────────────┐                           ┌──────────────────────┐        │
│  │   Branch     │──────────────┐            │  PaymentConfig       │        │
│  │              │              │            │  (Separate Schema)   │        │
│  └──────────────┘              │            │  - provider          │        │
│         │                      │            │  - environment       │        │
│         │ 1:N (optional)       │            │  - shortCode         │        │
│         ▼                      │            │  - credentials       │        │
│  ┌──────────────────────┐      │            │  - priority          │        │
│  │  BranchPaymentConfig │◀─────┘            │  - status            │        │
│  │  (Override)          │                   └──────────────────────┘        │
│  └──────────────────────┘                              │                    │
│                                                        │ 1:N                │
│                                                        ▼                    │
│                                             ┌──────────────────────┐        │
│                                             │  ConfigVersion       │        │
│                                             │  (History/Rotation)  │        │
│                                             └──────────────────────┘        │
│                                                        │                    │
│                                                        │ 1:N                │
│                                                        ▼                    │
│                                             ┌──────────────────────┐        │
│                                             │  VerificationLog     │        │
│                                             │  (Audit Trail)       │        │
│                                             └──────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schemas

### 1. PaymentConfig Schema (NEW)

```typescript
// apps/api/src/payments/schemas/payment-config.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentConfigDocument = HydratedDocument<PaymentConfig>;

/**
 * Payment Provider Types
 */
export enum PaymentProvider {
  MPESA_PAYBILL = 'mpesa_paybill',
  MPESA_TILL = 'mpesa_till',
  AIRTEL_MONEY = 'airtel_money',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
}

/**
 * Configuration Environment
 */
export enum ConfigEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

/**
 * Configuration Status
 */
export enum ConfigStatus {
  DRAFT = 'draft',           // Initial state, not yet verified
  PENDING = 'pending',       // Submitted for verification
  VERIFIED = 'verified',     // Credentials verified successfully
  FAILED = 'failed',         // Verification failed
  SUSPENDED = 'suspended',   // Temporarily disabled
  EXPIRED = 'expired',       // Credentials expired
  ROTATED = 'rotated',       // Replaced by new version
}

@Schema({ timestamps: true, collection: 'payment_configs' })
export class PaymentConfig {
  // ============================================
  // TENANT ASSOCIATION
  // ============================================
  
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  /**
   * Optional branch-level override
   * If null, this is a shop-level config
   */
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  // ============================================
  // PROVIDER CONFIGURATION
  // ============================================

  @Prop({ required: true, enum: PaymentProvider, index: true })
  provider: PaymentProvider;

  @Prop({ required: true, enum: ConfigEnvironment, default: ConfigEnvironment.SANDBOX })
  environment: ConfigEnvironment;

  /**
   * Human-readable name for this configuration
   * e.g., "Main Store Till", "Branch A Paybill"
   */
  @Prop({ required: true, trim: true })
  name: string;

  /**
   * Unique identifier for the payment account
   * - M-Pesa: Paybill or Till number
   * - Airtel: Merchant ID
   * - Bank: Account number
   */
  @Prop({ required: true, trim: true, index: true })
  shortCode: string;

  /**
   * Account type for M-Pesa
   */
  @Prop({ enum: ['paybill', 'till'], required: false })
  mpesaType?: 'paybill' | 'till';

  /**
   * Account prefix for Paybill (optional)
   */
  @Prop({ required: false, trim: true })
  accountPrefix?: string;

  // ============================================
  // ENCRYPTED CREDENTIALS
  // ============================================

  /**
   * Encrypted credentials object
   * Structure varies by provider
   */
  @Prop({ type: Object, required: true })
  credentials: {
    // M-Pesa credentials
    consumerKey?: string;
    consumerKeyIv?: string;
    consumerKeyTag?: string;
    
    consumerSecret?: string;
    consumerSecretIv?: string;
    consumerSecretTag?: string;
    
    passkey?: string;
    passkeyIv?: string;
    passkeyTag?: string;

    // Airtel Money credentials
    clientId?: string;
    clientSecret?: string;
    
    // Bank credentials
    apiKey?: string;
    merchantId?: string;
    
    // Generic encrypted blob for future providers
    encryptedBlob?: string;
    encryptedBlobIv?: string;
    encryptedBlobTag?: string;
  };

  // ============================================
  // CALLBACK CONFIGURATION
  // ============================================

  @Prop({ required: false, trim: true })
  callbackUrl?: string;

  @Prop({ required: false, trim: true })
  validationUrl?: string;

  @Prop({ required: false, trim: true })
  confirmationUrl?: string;

  // ============================================
  // STATUS & PRIORITY
  // ============================================

  @Prop({ required: true, enum: ConfigStatus, default: ConfigStatus.DRAFT, index: true })
  status: ConfigStatus;

  /**
   * Priority for failover (lower = higher priority)
   * Used when multiple configs exist for same provider
   */
  @Prop({ required: true, default: 0 })
  priority: number;

  /**
   * Whether this config is currently active
   */
  @Prop({ required: true, default: false })
  isActive: boolean;

  /**
   * Whether this is the default config for the provider
   */
  @Prop({ required: true, default: false })
  isDefault: boolean;

  // ============================================
  // VERIFICATION
  // ============================================

  @Prop({ required: false })
  verifiedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId;

  @Prop({ required: false })
  lastTestedAt?: Date;

  @Prop({ required: false })
  lastTestResult?: 'success' | 'failed';

  @Prop({ required: false, trim: true })
  lastTestError?: string;

  // ============================================
  // VERSIONING
  // ============================================

  /**
   * Version number for this configuration
   * Incremented on each credential update
   */
  @Prop({ required: true, default: 1 })
  version: number;

  /**
   * Reference to previous version (for rotation tracking)
   */
  @Prop({ required: false, type: Types.ObjectId, ref: 'PaymentConfig' })
  previousVersionId?: Types.ObjectId;

  /**
   * Scheduled rotation date
   */
  @Prop({ required: false })
  rotationScheduledAt?: Date;

  // ============================================
  // LIMITS & THRESHOLDS
  // ============================================

  @Prop({ required: false, default: 1 })
  minAmount?: number;

  @Prop({ required: false, default: 150000 })
  maxAmount?: number;

  @Prop({ required: false })
  dailyLimit?: number;

  @Prop({ required: false })
  monthlyLimit?: number;

  // ============================================
  // METADATA
  // ============================================

  @Prop({ type: Object, default: {} })
  metadata?: {
    notes?: string;
    tags?: string[];
    externalId?: string;
    [key: string]: any;
  };

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentConfigSchema = SchemaFactory.createForClass(PaymentConfig);

// ============================================
// INDEXES
// ============================================

// Unique constraint: One active config per provider per environment per shop/branch
PaymentConfigSchema.index(
  { shopId: 1, branchId: 1, provider: 1, environment: 1, shortCode: 1 },
  { unique: true, name: 'unique_config_per_tenant' }
);

// Query optimization
PaymentConfigSchema.index({ shopId: 1, provider: 1, isActive: 1 });
PaymentConfigSchema.index({ shopId: 1, branchId: 1, isActive: 1 });
PaymentConfigSchema.index({ shortCode: 1, provider: 1 });
PaymentConfigSchema.index({ status: 1, rotationScheduledAt: 1 });
```

### 2. VerificationLog Schema (NEW)

```typescript
// apps/api/src/payments/schemas/verification-log.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VerificationLogDocument = HydratedDocument<VerificationLog>;

export enum VerificationType {
  CREDENTIAL_TEST = 'credential_test',
  OAUTH_TOKEN = 'oauth_token',
  STK_PUSH_TEST = 'stk_push_test',
  CALLBACK_TEST = 'callback_test',
  BALANCE_CHECK = 'balance_check',
}

export enum VerificationResult {
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  ERROR = 'error',
}

@Schema({ timestamps: true, collection: 'verification_logs' })
export class VerificationLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentConfig', index: true })
  configId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, enum: VerificationType })
  type: VerificationType;

  @Prop({ required: true, enum: VerificationResult })
  result: VerificationResult;

  @Prop({ required: false })
  responseCode?: string;

  @Prop({ required: false })
  responseMessage?: string;

  @Prop({ required: false })
  errorDetails?: string;

  @Prop({ required: false })
  durationMs?: number;

  @Prop({ required: false, type: Object })
  requestPayload?: Record<string, any>;

  @Prop({ required: false, type: Object })
  responsePayload?: Record<string, any>;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  initiatedBy: Types.ObjectId;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  createdAt?: Date;
}

export const VerificationLogSchema = SchemaFactory.createForClass(VerificationLog);

// Indexes
VerificationLogSchema.index({ configId: 1, createdAt: -1 });
VerificationLogSchema.index({ shopId: 1, type: 1, createdAt: -1 });
```

### 3. ConfigAuditLog Schema (NEW)

```typescript
// apps/api/src/payments/schemas/config-audit-log.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConfigAuditLogDocument = HydratedDocument<ConfigAuditLog>;

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  VERIFY = 'verify',
  ROTATE = 'rotate',
  SUSPEND = 'suspend',
  RESTORE = 'restore',
}

@Schema({ timestamps: true, collection: 'config_audit_logs' })
export class ConfigAuditLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentConfig', index: true })
  configId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, enum: AuditAction })
  action: AuditAction;

  /**
   * Fields that were changed (for UPDATE action)
   * Sensitive values are masked
   */
  @Prop({ type: Object })
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  /**
   * Snapshot of config before change (sensitive data masked)
   */
  @Prop({ type: Object })
  previousState?: Record<string, any>;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  performedBy: Types.ObjectId;

  @Prop({ required: false })
  reason?: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  createdAt?: Date;
}

export const ConfigAuditLogSchema = SchemaFactory.createForClass(ConfigAuditLog);

// Indexes
ConfigAuditLogSchema.index({ configId: 1, createdAt: -1 });
ConfigAuditLogSchema.index({ shopId: 1, action: 1, createdAt: -1 });
ConfigAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY RELATIONSHIP DIAGRAM                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │     Shop     │
                                    │   (Tenant)   │
                                    └──────┬───────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                          │ 1:N            │ 1:N            │ 1:N
                          ▼                ▼                ▼
                   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                   │    Branch    │ │PaymentConfig │ │     User     │
                   │              │ │              │ │              │
                   └──────┬───────┘ └──────┬───────┘ └──────────────┘
                          │                │                │
                          │ 1:N            │                │
                          ▼                │                │
                   ┌──────────────┐        │                │
                   │BranchPayment │        │                │
                   │   Config     │◀───────┘                │
                   │  (Optional)  │                         │
                   └──────────────┘                         │
                                           │                │
                          ┌────────────────┼────────────────┤
                          │                │                │
                          │ 1:N            │ 1:N            │
                          ▼                ▼                ▼
                   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                   │Verification  │ │ ConfigAudit  │ │   MpesaTx    │
                   │    Log       │ │    Log       │ │              │
                   └──────────────┘ └──────────────┘ └──────────────┘


RELATIONSHIPS:
─────────────────────────────────────────────────────────────────────

Shop ──1:N──▶ Branch
  A shop can have multiple branches

Shop ──1:N──▶ PaymentConfig
  A shop can have multiple payment configurations
  (different providers, environments, or backup tills)

Branch ──1:N──▶ PaymentConfig (optional)
  A branch can override shop-level payment config

PaymentConfig ──1:N──▶ VerificationLog
  Each config has a history of verification attempts

PaymentConfig ──1:N──▶ ConfigAuditLog
  Each config has a complete audit trail

PaymentConfig ──1:1──▶ PaymentConfig (previousVersionId)
  Self-reference for version history / rotation

User ──1:N──▶ ConfigAuditLog
  Track who made changes

User ──1:N──▶ VerificationLog
  Track who initiated verifications
```

---

## API Design

### Payment Config Endpoints

```typescript
// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * List all payment configs for a shop
 * GET /api/payments/configs
 * 
 * Query params:
 * - provider: Filter by provider
 * - environment: Filter by environment
 * - status: Filter by status
 * - branchId: Filter by branch
 */
@Get('configs')
async listConfigs(@Query() query: ListConfigsDto): Promise<PaymentConfig[]>

/**
 * Get a specific payment config
 * GET /api/payments/configs/:id
 */
@Get('configs/:id')
async getConfig(@Param('id') id: string): Promise<PaymentConfig>

/**
 * Create a new payment config
 * POST /api/payments/configs
 */
@Post('configs')
async createConfig(@Body() dto: CreatePaymentConfigDto): Promise<PaymentConfig>

/**
 * Update a payment config
 * PUT /api/payments/configs/:id
 */
@Put('configs/:id')
async updateConfig(
  @Param('id') id: string,
  @Body() dto: UpdatePaymentConfigDto
): Promise<PaymentConfig>

/**
 * Delete a payment config
 * DELETE /api/payments/configs/:id
 */
@Delete('configs/:id')
async deleteConfig(@Param('id') id: string): Promise<void>

// ============================================
// STATUS OPERATIONS
// ============================================

/**
 * Activate a payment config
 * POST /api/payments/configs/:id/activate
 */
@Post('configs/:id/activate')
async activateConfig(@Param('id') id: string): Promise<PaymentConfig>

/**
 * Deactivate a payment config
 * POST /api/payments/configs/:id/deactivate
 */
@Post('configs/:id/deactivate')
async deactivateConfig(@Param('id') id: string): Promise<PaymentConfig>

/**
 * Set as default config for provider
 * POST /api/payments/configs/:id/set-default
 */
@Post('configs/:id/set-default')
async setDefaultConfig(@Param('id') id: string): Promise<PaymentConfig>

// ============================================
// VERIFICATION OPERATIONS
// ============================================

/**
 * Verify credentials
 * POST /api/payments/configs/:id/verify
 */
@Post('configs/:id/verify')
async verifyConfig(@Param('id') id: string): Promise<VerificationResult>

/**
 * Get verification history
 * GET /api/payments/configs/:id/verification-logs
 */
@Get('configs/:id/verification-logs')
async getVerificationLogs(@Param('id') id: string): Promise<VerificationLog[]>

// ============================================
// ROTATION OPERATIONS
// ============================================

/**
 * Rotate credentials (create new version)
 * POST /api/payments/configs/:id/rotate
 */
@Post('configs/:id/rotate')
async rotateConfig(
  @Param('id') id: string,
  @Body() dto: RotateConfigDto
): Promise<PaymentConfig>

/**
 * Get version history
 * GET /api/payments/configs/:id/versions
 */
@Get('configs/:id/versions')
async getVersionHistory(@Param('id') id: string): Promise<PaymentConfig[]>

// ============================================
// RUNTIME RESOLUTION
// ============================================

/**
 * Get active till for payment processing
 * This is the core runtime function
 * GET /api/payments/active-config
 */
@Get('active-config')
async getActiveConfig(
  @Query('provider') provider: PaymentProvider,
  @Query('branchId') branchId?: string,
  @Query('environment') environment?: ConfigEnvironment
): Promise<PaymentConfig>
```

### Sample DTOs

```typescript
// CreatePaymentConfigDto
export class CreatePaymentConfigDto {
  @IsString()
  name: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsEnum(ConfigEnvironment)
  environment: ConfigEnvironment;

  @IsString()
  shortCode: string;

  @IsOptional()
  @IsEnum(['paybill', 'till'])
  mpesaType?: 'paybill' | 'till';

  @IsOptional()
  @IsString()
  accountPrefix?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string;

  // Credentials (will be encrypted before storage)
  @IsOptional()
  @IsString()
  consumerKey?: string;

  @IsOptional()
  @IsString()
  consumerSecret?: string;

  @IsOptional()
  @IsString()
  passkey?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;
}
```

---

## Core Service: getActiveTill

```typescript
// apps/api/src/payments/services/payment-config.service.ts

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentConfig, PaymentConfigDocument, PaymentProvider, ConfigEnvironment, ConfigStatus } from '../schemas/payment-config.schema';
import { MpesaEncryptionService } from './mpesa-encryption.service';

@Injectable()
export class PaymentConfigService {
  private readonly logger = new Logger(PaymentConfigService.name);

  constructor(
    @InjectModel(PaymentConfig.name) 
    private readonly configModel: Model<PaymentConfigDocument>,
    private readonly encryptionService: MpesaEncryptionService,
  ) {}

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
  ): Promise<{
    config: PaymentConfig;
    decryptedCredentials: {
      consumerKey?: string;
      consumerSecret?: string;
      passkey?: string;
    };
  }> {
    const env = environment || this.getDefaultEnvironment();

    // Step 1: Try branch-specific config first
    if (branchId) {
      const branchConfig = await this.findActiveConfig(shopId, provider, env, branchId);
      if (branchConfig) {
        this.logger.log(`Using branch-level config for shop ${shopId}, branch ${branchId}`);
        return this.prepareConfigResponse(branchConfig);
      }
    }

    // Step 2: Fall back to shop-level config
    const shopConfig = await this.findActiveConfig(shopId, provider, env);
    if (shopConfig) {
      this.logger.log(`Using shop-level config for shop ${shopId}`);
      return this.prepareConfigResponse(shopConfig);
    }

    // Step 3: No config found
    throw new BadRequestException(
      `No active ${provider} configuration found for this shop. ` +
      `Please configure your payment settings.`
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
      query.branchId = { $exists: false };
    }

    // Get all matching configs sorted by priority
    const configs = await this.configModel
      .find(query)
      .sort({ priority: 1, isDefault: -1 })
      .exec();

    if (configs.length === 0) {
      return null;
    }

    // Return the highest priority (lowest number) config
    // In future, can implement health checks for failover
    return configs[0];
  }

  /**
   * Prepare config response with decrypted credentials
   */
  private async prepareConfigResponse(config: PaymentConfigDocument) {
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

  /**
   * Get default environment from config
   */
  private getDefaultEnvironment(): ConfigEnvironment {
    return process.env.MPESA_ENV === 'production'
      ? ConfigEnvironment.PRODUCTION
      : ConfigEnvironment.SANDBOX;
  }

  // ============================================
  // VALIDATION RULES
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
  ): Promise<{ isUnique: boolean; conflictingConfig?: PaymentConfig }> {
    const query: any = {
      shortCode,
      provider,
      environment,
    };

    if (excludeConfigId) {
      query._id = { $ne: new Types.ObjectId(excludeConfigId) };
    }

    // Check if same till is used by same shop (allowed for different branches)
    const sameShopConfig = await this.configModel.findOne({
      ...query,
      shopId: new Types.ObjectId(shopId),
      branchId: branchId ? new Types.ObjectId(branchId) : { $exists: false },
    }).exec();

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
      // Could add a flag to allow shared tills if needed
      return {
        isUnique: false,
        conflictingConfig: otherShopConfig,
      };
    }

    return { isUnique: true };
  }

  // ============================================
  // FAILOVER LOGIC
  // ============================================

  /**
   * Get next available config for failover
   */
  async getFailoverConfig(
    shopId: string,
    provider: PaymentProvider,
    environment: ConfigEnvironment,
    excludeConfigId: string,
  ): Promise<PaymentConfigDocument | null> {
    return this.configModel.findOne({
      shopId: new Types.ObjectId(shopId),
      provider,
      environment,
      status: ConfigStatus.VERIFIED,
      isActive: true,
      _id: { $ne: new Types.ObjectId(excludeConfigId) },
    })
    .sort({ priority: 1 })
    .exec();
  }
}
```

---

## Security Model

### 1. Encryption at Rest

```typescript
// All sensitive credentials encrypted using AES-256-GCM
// Each field has its own IV and auth tag for maximum security

interface EncryptedCredentials {
  consumerKey: string;      // Encrypted value
  consumerKeyIv: string;    // Initialization vector
  consumerKeyTag: string;   // Authentication tag
  
  consumerSecret: string;
  consumerSecretIv: string;
  consumerSecretTag: string;
  
  passkey: string;
  passkeyIv: string;
  passkeyTag: string;
}
```

### 2. Access Control Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ACCESS CONTROL MATRIX                            │
├─────────────────────┬───────────┬───────────┬───────────┬──────────────┤
│      ACTION         │   ADMIN   │  MANAGER  │  CASHIER  │ SUPER_ADMIN  │
├─────────────────────┼───────────┼───────────┼───────────┼──────────────┤
│ View configs        │    ✅     │    ✅     │    ❌     │     ✅       │
│ Create config       │    ✅     │    ❌     │    ❌     │     ✅       │
│ Update config       │    ✅     │    ❌     │    ❌     │     ✅       │
│ Delete config       │    ✅     │    ❌     │    ❌     │     ✅       │
│ Verify credentials  │    ✅     │    ❌     │    ❌     │     ✅       │
│ Activate/Deactivate │    ✅     │    ❌     │    ❌     │     ✅       │
│ View audit logs     │    ✅     │    ✅     │    ❌     │     ✅       │
│ Rotate credentials  │    ✅     │    ❌     │    ❌     │     ✅       │
│ View decrypted keys │    ❌     │    ❌     │    ❌     │     ❌       │
│ Use for payments    │    ✅     │    ✅     │    ✅     │     ✅       │
└─────────────────────┴───────────┴───────────┴───────────┴──────────────┘

Note: Decrypted keys are NEVER exposed to any user. They are only used
internally by the payment processing service.
```

### 3. Audit Logging

```typescript
// Every config change is logged with:
interface AuditLogEntry {
  configId: string;
  shopId: string;
  action: 'create' | 'update' | 'delete' | 'activate' | 'verify' | 'rotate';
  changes: {
    field: string;
    oldValue: any;  // Masked for sensitive fields
    newValue: any;  // Masked for sensitive fields
  }[];
  performedBy: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

// Sensitive fields are masked in logs:
// consumerKey: "****abcd" (last 4 chars only)
// consumerSecret: "********" (fully masked)
// passkey: "********" (fully masked)
```

---

## Workflow Diagrams

### 1. Adding a New Till

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ADD NEW TILL WORKFLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │  Admin  │────▶│ Enter Till   │────▶│  Validate    │────▶│   Encrypt    │
    │  User   │     │  Details     │     │  Uniqueness  │     │ Credentials  │
    └─────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │                     │
                                                │ ❌ Duplicate        │
                                                ▼                     ▼
                                         ┌──────────────┐     ┌──────────────┐
                                         │ Show Error   │     │ Save Config  │
                                         │ Message      │     │ (DRAFT)      │
                                         └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │ Create Audit │
                                                              │    Log       │
                                                              └──────────────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Prompt     │
                                                              │   Verify     │
                                                              └──────────────┘
```

### 2. Verification Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         VERIFICATION WORKFLOW                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │  Admin  │────▶│ Click Verify │────▶│  Decrypt     │────▶│  Get OAuth   │
    │  User   │     │  Button      │     │ Credentials  │     │   Token      │
    └─────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                         ┌────────────────────────────┴─────┐
                                         │                                  │
                                         ▼ ✅ Success                       ▼ ❌ Failed
                                  ┌──────────────┐                   ┌──────────────┐
                                  │ Update Status│                   │ Update Status│
                                  │ = VERIFIED   │                   │ = FAILED     │
                                  └──────────────┘                   └──────────────┘
                                         │                                  │
                                         ▼                                  ▼
                                  ┌──────────────┐                   ┌──────────────┐
                                  │ Log Success  │                   │ Log Failure  │
                                  │ Verification │                   │ + Error      │
                                  └──────────────┘                   └──────────────┘
                                         │                                  │
                                         ▼                                  ▼
                                  ┌──────────────┐                   ┌──────────────┐
                                  │ Enable       │                   │ Show Error   │
                                  │ Activation   │                   │ + Retry      │
                                  └──────────────┘                   └──────────────┘
```

### 3. Runtime Payment Processing

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      RUNTIME PAYMENT PROCESSING                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │ Cashier │────▶│ Initiate     │────▶│ getActiveTill│────▶│ Check Branch │
    │         │     │ Payment      │     │ (shopId,     │     │   Config     │
    └─────────┘     └──────────────┘     │  provider,   │     └──────────────┘
                                         │  branchId)   │            │
                                         └──────────────┘            │
                                                              ┌──────┴──────┐
                                                              │             │
                                                         ✅ Found      ❌ Not Found
                                                              │             │
                                                              ▼             ▼
                                                       ┌──────────┐  ┌──────────────┐
                                                       │  Use     │  │ Check Shop   │
                                                       │ Branch   │  │   Config     │
                                                       │ Config   │  └──────────────┘
                                                       └──────────┘         │
                                                              │       ┌─────┴─────┐
                                                              │  ✅ Found    ❌ Not Found
                                                              │       │           │
                                                              ▼       ▼           ▼
                                                       ┌──────────────┐   ┌──────────────┐
                                                       │   Decrypt    │   │ Return Error │
                                                       │ Credentials  │   │ "Not Config" │
                                                       └──────────────┘   └──────────────┘
                                                              │
                                                              ▼
                                                       ┌──────────────┐
                                                       │ Process STK  │
                                                       │    Push      │
                                                       └──────────────┘
                                                              │
                                                    ┌─────────┴─────────┐
                                               ✅ Success          ❌ Failed
                                                    │                   │
                                                    ▼                   ▼
                                             ┌──────────────┐   ┌──────────────┐
                                             │ Complete     │   │ Try Failover │
                                             │ Transaction  │   │   Config?    │
                                             └──────────────┘   └──────────────┘
```

### 4. Till Rotation Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          TILL ROTATION WORKFLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │  Admin  │────▶│ Initiate     │────▶│ Create New   │────▶│   Verify     │
    │         │     │ Rotation     │     │ Config v2    │     │ New Creds    │
    └─────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                              ┌───────┴───────┐
                                                         ✅ Verified    ❌ Failed
                                                              │               │
                                                              ▼               ▼
                                                       ┌──────────────┐ ┌──────────────┐
                                                       │ Deactivate   │ │ Keep Old     │
                                                       │ Old Config   │ │ Config Active│
                                                       └──────────────┘ └──────────────┘
                                                              │
                                                              ▼
                                                       ┌──────────────┐
                                                       │ Activate     │
                                                       │ New Config   │
                                                       └──────────────┘
                                                              │
                                                              ▼
                                                       ┌──────────────┐
                                                       │ Mark Old as  │
                                                       │ ROTATED      │
                                                       └──────────────┘
                                                              │
                                                              ▼
                                                       ┌──────────────┐
                                                       │ Log Rotation │
                                                       │ Audit Trail  │
                                                       └──────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Create PaymentConfig schema | High | 4h | Pending |
| Create VerificationLog schema | High | 2h | Pending |
| Create ConfigAuditLog schema | High | 2h | Pending |
| Migrate existing mpesaConfig to new schema | High | 4h | Pending |
| Create PaymentConfigService | High | 8h | Pending |
| Add CRUD endpoints | High | 4h | Pending |

### Phase 2: Verification & Security (Week 2-3)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Implement verification workflow | High | 4h | Pending |
| Add verification logging | High | 2h | Pending |
| Implement audit logging | High | 4h | Pending |
| Add till uniqueness validation | Medium | 2h | Pending |
| Update encryption service | Medium | 2h | Pending |

### Phase 3: Multi-Branch Support (Week 3-4)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Add branch-level config support | High | 4h | Pending |
| Update getActiveTill for branches | High | 4h | Pending |
| Add branch config UI | Medium | 8h | Pending |
| Test branch failover | Medium | 4h | Pending |

### Phase 4: Advanced Features (Week 4-5)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Implement failover logic | Medium | 4h | Pending |
| Add credential rotation | Low | 4h | Pending |
| Add multiple provider support | Low | 8h | Pending |
| Add scheduled rotation | Low | 4h | Pending |

### Phase 5: Frontend Updates (Week 5-6)

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Update M-Pesa settings UI | High | 8h | Pending |
| Add multi-config management | Medium | 8h | Pending |
| Add branch config selector | Medium | 4h | Pending |
| Add audit log viewer | Low | 4h | Pending |

---

## Summary

### Current System Score: 7/10

**Strengths:**
- ✅ Solid encryption (AES-256-GCM)
- ✅ Shop-level isolation
- ✅ No platform fallback
- ✅ Verification workflow
- ✅ Transaction state machine

**Gaps to Address:**
- ❌ Single config per shop (need multiple)
- ❌ No branch-level configs
- ❌ No audit logging
- ❌ No till uniqueness validation
- ❌ No failover support
- ❌ No version history

### Recommended Priority

1. **Immediate**: Add PaymentConfig schema + migration
2. **Short-term**: Add audit logging + verification logs
3. **Medium-term**: Branch-level configs + failover
4. **Long-term**: Multiple providers + rotation

This architecture will scale to support thousands of tenants with enterprise-grade security and compliance.
