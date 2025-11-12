import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
  ) {}

  /**
   * Log user activity
   */
  async logActivity(
    shopId: string,
    userId: string,
    userName: string,
    userRole: 'admin' | 'cashier' | 'super_admin',
    action: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ActivityDocument | null> {
    try {
      // Skip activity logging for super admin (no shopId)
      if (userRole === 'super_admin' || !shopId) {
        return null;
      }

      const activity = new this.activityModel({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(userId),
        userName,
        userRole,
        action,
        details: details || {},
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });
      return await activity.save();
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error.message}`, error.stack);
      // Don't throw - activity logging should not break the application
      return null;
    }
  }

  /**
   * Get activity log for a shop
   */
  async getShopActivityLog(
    shopId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get activity log for a specific cashier
   */
  async getCashierActivityLog(
    shopId: string,
    cashierId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(cashierId),
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get activity count for a shop
   */
  async getShopActivityCount(shopId: string): Promise<number> {
    return this.activityModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
    });
  }

  /**
   * Get activity by action type
   */
  async getActivityByAction(
    shopId: string,
    action: string,
    limit: number = 50,
  ): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({
        shopId: new Types.ObjectId(shopId),
        action,
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get cashier transactions (checkout actions)
   */
  async getCashierTransactions(
    shopId: string,
    cashierId: string,
    limit: number = 50,
  ): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(cashierId),
        action: 'checkout',
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get today's activity for a shop
   */
  async getTodayActivity(shopId: string): Promise<ActivityDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.activityModel
      .find({
        shopId: new Types.ObjectId(shopId),
        timestamp: {
          $gte: today,
          $lt: tomorrow,
        },
      })
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Get cashier login/logout events
   */
  async getCashierSessions(
    shopId: string,
    cashierId: string,
    limit: number = 50,
  ): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(cashierId),
        action: { $in: ['login', 'logout'] },
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Delete old activity logs (older than 90 days)
   */
  async cleanupOldLogs(): Promise<any> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return this.activityModel.deleteMany({
      timestamp: { $lt: ninetyDaysAgo },
    });
  }
}
