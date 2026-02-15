import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SystemAuditLogDocument = HydratedDocument<SystemAuditLog>;

/**
 * Action categories for audit logging
 */
export enum AuditActionCategory {
  // Authentication & Access
  AUTH = 'auth',
  // User Management
  USER = 'user',
  // Shop Management
  SHOP = 'shop',
  // Subscription & Billing
  SUBSCRIPTION = 'subscription',
  // Payment Processing
  PAYMENT = 'payment',
  // System Configuration
  SYSTEM = 'system',
  // Email & Notifications
  NOTIFICATION = 'notification',
  // Data Management
  DATA = 'data',
}

/**
 * CRUD action types
 */
export enum AuditActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute', // For actions like login, logout, payment processing
}

/**
 * System Audit Log Schema
 * 
 * Comprehensive audit logging for super admin oversight.
 * Based on industry best practices:
 * - Immutable records
 * - Time synced (server time)
 * - Searchable & filterable
 * - Contains who, what, when, where
 */
@Schema({ timestamps: true })
export class SystemAuditLog {
  // WHO - The actor performing the action
  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'SuperAdmin' })
  superAdminId?: Types.ObjectId;

  @Prop({ required: false })
  actorEmail?: string;

  @Prop({ required: false })
  actorName?: string;

  @Prop({ required: false, enum: ['user', 'admin', 'super_admin', 'system', 'anonymous'] })
  actorType?: string;

  // WHAT - The action and target
  @Prop({ required: true, enum: AuditActionCategory })
  category: AuditActionCategory;

  @Prop({ required: true, enum: AuditActionType })
  actionType: AuditActionType;

  @Prop({ required: true })
  action: string; // e.g., 'user.login', 'shop.verified', 'payment.completed'

  @Prop({ required: true })
  description: string; // Human-readable description

  // Target resource
  @Prop({ required: false })
  targetType?: string; // e.g., 'Shop', 'User', 'Subscription', 'Invoice'

  @Prop({ required: false, type: Types.ObjectId })
  targetId?: Types.ObjectId;

  @Prop({ required: false })
  targetName?: string; // e.g., shop name, user email

  // Shop context (for multi-tenant tracking)
  @Prop({ required: false, type: Types.ObjectId, ref: 'Shop' })
  shopId?: Types.ObjectId;

  @Prop({ required: false })
  shopName?: string;

  // WHEN - Timestamp (auto-set by timestamps: true)
  // createdAt is automatically added

  // WHERE - Location/context
  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: false })
  country?: string;

  @Prop({ required: false })
  city?: string;

  // Change tracking
  @Prop({ type: Object, required: false })
  oldValue?: Record<string, any>;

  @Prop({ type: Object, required: false })
  newValue?: Record<string, any>;

  // Additional context
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  @Prop({ required: false })
  notes?: string;

  // Status tracking
  @Prop({ required: true, enum: ['success', 'failure', 'warning'], default: 'success' })
  status: 'success' | 'failure' | 'warning';

  @Prop({ required: false })
  errorMessage?: string;

  @Prop({ required: false })
  errorCode?: string;

  // Request tracking
  @Prop({ required: false })
  requestId?: string; // For correlating related events

  @Prop({ required: false })
  sessionId?: string;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const SystemAuditLogSchema = SchemaFactory.createForClass(SystemAuditLog);

// Indexes for efficient querying
SystemAuditLogSchema.index({ createdAt: -1 });
SystemAuditLogSchema.index({ category: 1, createdAt: -1 });
SystemAuditLogSchema.index({ action: 1, createdAt: -1 });
SystemAuditLogSchema.index({ actorId: 1, createdAt: -1 });
SystemAuditLogSchema.index({ superAdminId: 1, createdAt: -1 });
SystemAuditLogSchema.index({ shopId: 1, createdAt: -1 });
SystemAuditLogSchema.index({ targetType: 1, targetId: 1 });
SystemAuditLogSchema.index({ status: 1, createdAt: -1 });
SystemAuditLogSchema.index({ actorEmail: 1 });
// Compound index for filtering
SystemAuditLogSchema.index({ category: 1, actionType: 1, createdAt: -1 });
// TTL index - auto-delete after 1 year (configurable)
// SystemAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
