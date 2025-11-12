import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Log an action
   * Multi-tenant safe: requires shopId
   */
  async log(
    shopId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    changes?: any,
    branchId?: string,
  ): Promise<AuditLogDocument> {
    const log = new this.auditModel({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(userId),
      action,
      resource,
      resourceId: resourceId ? new Types.ObjectId(resourceId) : undefined,
      changes,
      branchId: branchId ? new Types.ObjectId(branchId) : undefined,
    });

    const saved = await log.save();
    this.logger.debug(`Audit logged: ${action} on ${resource}`);
    return saved;
  }

  /**
   * Get audit logs for shop
   * Multi-tenant safe: filters by shopId
   */
  async getByShop(
    shopId: string,
    filters?: {
      action?: string;
      resource?: string;
      userId?: string;
      branchId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<AuditLogDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.action) query.action = filters.action;
    if (filters?.resource) query.resource = filters.resource;
    if (filters?.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters?.branchId) query.branchId = new Types.ObjectId(filters.branchId);

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    return this.auditModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 100)
      .exec();
  }

  /**
   * Get audit logs for branch
   * Multi-tenant safe: filters by shopId and branchId
   */
  async getByBranch(
    branchId: string,
    shopId: string,
    limit = 100,
  ): Promise<AuditLogDocument[]> {
    return this.auditModel
      .find({
        branchId: new Types.ObjectId(branchId),
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get audit logs for user
   * Multi-tenant safe: filters by shopId and userId
   */
  async getByUser(
    userId: string,
    shopId: string,
    limit = 100,
  ): Promise<AuditLogDocument[]> {
    return this.auditModel
      .find({
        userId: new Types.ObjectId(userId),
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get audit logs for resource
   * Multi-tenant safe: filters by shopId and resourceId
   */
  async getByResource(
    resourceId: string,
    shopId: string,
    limit = 100,
  ): Promise<AuditLogDocument[]> {
    return this.auditModel
      .find({
        resourceId: new Types.ObjectId(resourceId),
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get summary statistics
   * Multi-tenant safe: filters by shopId
   */
  async getStats(shopId: string): Promise<{
    totalLogs: number;
    actionCounts: { [key: string]: number };
    resourceCounts: { [key: string]: number };
    topUsers: Array<{ userId: string; count: number }>;
  }> {
    const logs = await this.auditModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    const actionCounts: { [key: string]: number } = {};
    const resourceCounts: { [key: string]: number } = {};
    const userCounts: { [key: string]: number } = {};

    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1;
      const userId = log.userId.toString();
      userCounts[userId] = (userCounts[userId] || 0) + 1;
    }

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      actionCounts,
      resourceCounts,
      topUsers,
    };
  }
}
