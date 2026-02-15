import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShopAuditLog, ShopAuditLogDocument } from '../schemas/shop-audit-log.schema';

export interface CreateAuditLogDto {
  shopId: string;
  performedBy: string;
  action: 'verify' | 'reject' | 'suspend' | 'reactivate' | 'flag' | 'unflag' | 'update' | 'create' | 'delete' | 'restore';
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  notes?: string;
}

@Injectable()
export class ShopAuditLogService {
  private readonly logger = new Logger(ShopAuditLogService.name);

  constructor(
    @InjectModel(ShopAuditLog.name) private readonly auditLogModel: Model<ShopAuditLogDocument>,
  ) {}

  /**
   * Create an audit log entry
   */
  async create(dto: CreateAuditLogDto): Promise<ShopAuditLogDocument> {
    try {
      const auditLog = new this.auditLogModel({
        shopId: new Types.ObjectId(dto.shopId),
        performedBy: new Types.ObjectId(dto.performedBy),
        action: dto.action,
        oldValue: dto.oldValue,
        newValue: dto.newValue,
        reason: dto.reason,
        notes: dto.notes,
        createdAt: new Date(),
      });
      return await auditLog.save();
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get audit logs for a shop
   */
  async getShopAuditLog(
    shopId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ShopAuditLogDocument[]> {
    return this.auditLogModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get audit logs by action
   */
  async getAuditLogsByAction(
    shopId: string,
    action: string,
    limit: number = 50,
  ): Promise<ShopAuditLogDocument[]> {
    return this.auditLogModel
      .find({
        shopId: new Types.ObjectId(shopId),
        action,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get audit logs by performer
   */
  async getAuditLogsByPerformer(
    performedBy: string,
    limit: number = 50,
  ): Promise<ShopAuditLogDocument[]> {
    return this.auditLogModel
      .find({ performedBy: new Types.ObjectId(performedBy) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get total audit log count for a shop
   */
  async getAuditLogCount(shopId: string): Promise<number> {
    return this.auditLogModel.countDocuments({ shopId: new Types.ObjectId(shopId) });
  }

  /**
   * Get verification history for a shop
   */
  async getVerificationHistory(shopId: string): Promise<ShopAuditLogDocument[]> {
    return this.auditLogModel
      .find({
        shopId: new Types.ObjectId(shopId),
        action: { $in: ['verify', 'reject', 'suspend', 'reactivate'] },
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
