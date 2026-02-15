import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog, ActivityLogDocument, ActivityType } from '../schemas/activity-log.schema';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  /**
   * Log an activity
   */
  async logActivity(
    shopId: string,
    activityType: ActivityType,
    description: string,
    details?: any,
    performedBy?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ActivityLogDocument | null> {
    try {
      const activity = new this.activityLogModel({
        shopId: new Types.ObjectId(shopId),
        activityType,
        description,
        details,
        performedBy: performedBy ? new Types.ObjectId(performedBy) : undefined,
        ipAddress,
        userAgent,
      });

      await activity.save();
      this.logger.log(`Activity logged for shop ${shopId}: ${activityType}`);
      return activity;
    } catch (error) {
      this.logger.error(`Failed to log activity for shop ${shopId}:`, error);
      // Don't throw - activity logging should not break main operations
      return null;
    }
  }

  /**
   * Get activity history for a shop
   */
  async getActivityHistory(
    shopId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('performedBy', 'name email')
      .exec();
  }

  /**
   * Get activity count for a shop
   */
  async getActivityCount(shopId: string): Promise<number> {
    return this.activityLogModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
    });
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(
    shopId: string,
    activityType: ActivityType,
    limit: number = 20,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({
        shopId: new Types.ObjectId(shopId),
        activityType,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get activities within a date range
   */
  async getActivitiesByDateRange(
    shopId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get summary of recent activities
   */
  async getActivitySummary(shopId: string): Promise<any> {
    const activities = await this.activityLogModel
      .aggregate([
        { $match: { shopId: new Types.ObjectId(shopId) } },
        { $group: { _id: '$activityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .exec();

    const recentActivities = await this.activityLogModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    return {
      summary: activities,
      recent: recentActivities,
    };
  }
}
