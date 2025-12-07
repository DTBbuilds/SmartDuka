import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConfigAuditLogDocument = HydratedDocument<ConfigAuditLog>;

/**
 * Audit action types for payment configuration changes
 */
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
  SET_DEFAULT = 'set_default',
  UPDATE_PRIORITY = 'update_priority',
  UPDATE_LIMITS = 'update_limits',
}

/**
 * Represents a single field change
 */
export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  isSensitive?: boolean; // If true, values are masked
}

/**
 * Configuration Audit Log Schema
 * 
 * Provides complete audit trail for all payment configuration changes.
 * Used for:
 * - Security auditing
 * - Compliance reporting
 * - Change tracking
 * - Rollback reference
 */
@Schema({ timestamps: true, collection: 'config_audit_logs' })
export class ConfigAuditLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentConfig', index: true })
  configId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, enum: AuditAction, index: true })
  action: AuditAction;

  /**
   * Human-readable description of the action
   */
  @Prop({ required: false })
  description?: string;

  /**
   * Fields that were changed (for UPDATE action)
   * Sensitive values are masked (e.g., "****abcd")
   */
  @Prop({ type: Array, default: [] })
  changes: FieldChange[];

  /**
   * Snapshot of config before change
   * Sensitive data is masked for security
   */
  @Prop({ type: Object })
  previousState?: Record<string, any>;

  /**
   * Snapshot of config after change
   * Sensitive data is masked for security
   */
  @Prop({ type: Object })
  newState?: Record<string, any>;

  /**
   * User who performed the action
   */
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  performedBy: Types.ObjectId;

  /**
   * User's name at time of action (for historical reference)
   */
  @Prop({ required: false })
  performedByName?: string;

  /**
   * User's role at time of action
   */
  @Prop({ required: false })
  performedByRole?: string;

  /**
   * Reason for the change (optional, required for some actions)
   */
  @Prop({ required: false })
  reason?: string;

  /**
   * IP address of the request
   */
  @Prop({ required: false })
  ipAddress?: string;

  /**
   * User agent string
   */
  @Prop({ required: false })
  userAgent?: string;

  /**
   * Session ID for correlation
   */
  @Prop({ required: false })
  sessionId?: string;

  /**
   * Request ID for correlation with logs
   */
  @Prop({ required: false })
  requestId?: string;

  /**
   * Provider affected
   */
  @Prop({ required: false })
  provider?: string;

  /**
   * Environment affected
   */
  @Prop({ required: false })
  environment?: string;

  /**
   * Config name at time of action
   */
  @Prop({ required: false })
  configName?: string;

  /**
   * Short code at time of action
   */
  @Prop({ required: false })
  shortCode?: string;

  /**
   * Version number after this change
   */
  @Prop({ required: false })
  configVersion?: number;

  // Timestamp (auto-managed)
  createdAt?: Date;
}

export const ConfigAuditLogSchema = SchemaFactory.createForClass(ConfigAuditLog);

// ============================================
// INDEXES
// ============================================

// Query by config
ConfigAuditLogSchema.index({ configId: 1, createdAt: -1 });

// Query by shop and action
ConfigAuditLogSchema.index({ shopId: 1, action: 1, createdAt: -1 });

// Query by user for audit
ConfigAuditLogSchema.index({ performedBy: 1, createdAt: -1 });

// Query by date range
ConfigAuditLogSchema.index({ createdAt: -1 });

// Query by action type
ConfigAuditLogSchema.index({ action: 1, createdAt: -1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Helper to mask sensitive field values
 */
export function maskSensitiveValue(value: any, field: string): any {
  const sensitiveFields = [
    'consumerKey',
    'consumerSecret',
    'passkey',
    'clientId',
    'clientSecret',
    'apiKey',
  ];

  if (!value) return value;
  
  if (sensitiveFields.some(f => field.toLowerCase().includes(f.toLowerCase()))) {
    if (typeof value === 'string' && value.length > 4) {
      return '****' + value.slice(-4);
    }
    return '********';
  }
  
  return value;
}

/**
 * Helper to create masked state snapshot
 */
export function createMaskedSnapshot(config: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    if (key === 'credentials' && typeof value === 'object') {
      masked[key] = {};
      for (const [credKey, credValue] of Object.entries(value)) {
        masked[key][credKey] = maskSensitiveValue(credValue, credKey);
      }
    } else {
      masked[key] = maskSensitiveValue(value, key);
    }
  }
  
  return masked;
}
