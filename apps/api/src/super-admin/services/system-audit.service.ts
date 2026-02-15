import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { 
  SystemAuditLog, 
  SystemAuditLogDocument, 
  AuditActionCategory, 
  AuditActionType 
} from '../schemas/system-audit-log.schema';

export interface CreateAuditLogDto {
  // Actor
  actorId?: string;
  superAdminId?: string;
  actorEmail?: string;
  actorName?: string;
  actorType?: 'user' | 'admin' | 'super_admin' | 'system' | 'anonymous';
  
  // Action
  category: AuditActionCategory;
  actionType: AuditActionType;
  action: string;
  description: string;
  
  // Target
  targetType?: string;
  targetId?: string;
  targetName?: string;
  
  // Context
  shopId?: string;
  shopName?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Changes
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  notes?: string;
  
  // Status
  status?: 'success' | 'failure' | 'warning';
  errorMessage?: string;
  errorCode?: string;
  
  // Tracking
  requestId?: string;
  sessionId?: string;
}

export interface AuditLogQueryOptions {
  category?: AuditActionCategory;
  actionType?: AuditActionType;
  action?: string;
  actorId?: string;
  actorEmail?: string;
  shopId?: string;
  targetType?: string;
  targetId?: string;
  status?: 'success' | 'failure' | 'warning';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class SystemAuditService {
  private readonly logger = new Logger(SystemAuditService.name);

  constructor(
    @InjectModel(SystemAuditLog.name)
    private readonly auditLogModel: Model<SystemAuditLogDocument>,
  ) {}

  /**
   * Create an audit log entry
   */
  async log(dto: CreateAuditLogDto): Promise<SystemAuditLogDocument> {
    try {
      const auditLog = new this.auditLogModel({
        actorId: dto.actorId ? new Types.ObjectId(dto.actorId) : undefined,
        superAdminId: dto.superAdminId ? new Types.ObjectId(dto.superAdminId) : undefined,
        actorEmail: dto.actorEmail,
        actorName: dto.actorName,
        actorType: dto.actorType || 'system',
        category: dto.category,
        actionType: dto.actionType,
        action: dto.action,
        description: dto.description,
        targetType: dto.targetType,
        targetId: dto.targetId ? new Types.ObjectId(dto.targetId) : undefined,
        targetName: dto.targetName,
        shopId: dto.shopId ? new Types.ObjectId(dto.shopId) : undefined,
        shopName: dto.shopName,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        oldValue: dto.oldValue,
        newValue: dto.newValue,
        metadata: dto.metadata,
        notes: dto.notes,
        status: dto.status || 'success',
        errorMessage: dto.errorMessage,
        errorCode: dto.errorCode,
        requestId: dto.requestId,
        sessionId: dto.sessionId,
      });

      return await auditLog.save();
    } catch (error: any) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      // Don't throw - audit logging should never break the main flow
      return null as any;
    }
  }

  /**
   * Query audit logs with filters
   */
  async query(options: AuditLogQueryOptions): Promise<{
    logs: SystemAuditLogDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: FilterQuery<SystemAuditLog> = {};

    if (options.category) query.category = options.category;
    if (options.actionType) query.actionType = options.actionType;
    if (options.action) query.action = { $regex: options.action, $options: 'i' };
    if (options.actorId) query.actorId = new Types.ObjectId(options.actorId);
    if (options.actorEmail) query.actorEmail = { $regex: options.actorEmail, $options: 'i' };
    if (options.shopId) query.shopId = new Types.ObjectId(options.shopId);
    if (options.targetType) query.targetType = options.targetType;
    if (options.targetId) query.targetId = new Types.ObjectId(options.targetId);
    if (options.status) query.status = options.status;

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const limit = options.limit || 50;
    const skip = options.skip || 0;
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sortBy = options.sortBy || 'createdAt';

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);

    return {
      logs,
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
    };
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(limit = 20): Promise<SystemAuditLogDocument[]> {
    return this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get activity by category
   */
  async getByCategory(
    category: AuditActionCategory,
    limit = 50,
    skip = 0,
  ): Promise<SystemAuditLogDocument[]> {
    return this.auditLogModel
      .find({ category })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get activity by actor
   */
  async getByActor(
    actorId: string,
    limit = 50,
    skip = 0,
  ): Promise<SystemAuditLogDocument[]> {
    return this.auditLogModel
      .find({ $or: [
        { actorId: new Types.ObjectId(actorId) },
        { superAdminId: new Types.ObjectId(actorId) },
      ]})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get activity for a specific shop
   */
  async getByShop(
    shopId: string,
    limit = 50,
    skip = 0,
  ): Promise<SystemAuditLogDocument[]> {
    return this.auditLogModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get failed actions
   */
  async getFailedActions(limit = 50, skip = 0): Promise<SystemAuditLogDocument[]> {
    return this.auditLogModel
      .find({ status: 'failure' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get audit log statistics
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    byActionType: Record<string, number>;
    recentFailures: number;
  }> {
    const dateQuery: any = {};
    if (startDate) dateQuery.$gte = startDate;
    if (endDate) dateQuery.$lte = endDate;

    const matchStage = Object.keys(dateQuery).length > 0 
      ? { createdAt: dateQuery } 
      : {};

    const [total, byCategory, byStatus, byActionType, recentFailures] = await Promise.all([
      this.auditLogModel.countDocuments(matchStage).exec(),
      this.auditLogModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]).exec(),
      this.auditLogModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.auditLogModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$actionType', count: { $sum: 1 } } },
      ]).exec(),
      this.auditLogModel.countDocuments({
        status: 'failure',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).exec(),
    ]);

    return {
      total,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byActionType: byActionType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentFailures,
    };
  }

  /**
   * Export audit logs to CSV format
   */
  async exportToCsv(options: AuditLogQueryOptions): Promise<string> {
    const { logs } = await this.query({ ...options, limit: 10000 });

    const headers = [
      'Timestamp',
      'Category',
      'Action',
      'Description',
      'Actor',
      'Actor Type',
      'Target',
      'Shop',
      'Status',
      'IP Address',
    ];

    const rows = logs.map(log => [
      log.createdAt?.toISOString() || '',
      log.category,
      log.action,
      log.description,
      log.actorEmail || log.actorName || '',
      log.actorType || '',
      log.targetName || log.targetId?.toString() || '',
      log.shopName || log.shopId?.toString() || '',
      log.status,
      log.ipAddress || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
