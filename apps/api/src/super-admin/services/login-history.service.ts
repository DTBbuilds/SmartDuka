import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginHistory, LoginHistoryDocument } from '../../auth/schemas/login-history.schema';

@Injectable()
export class LoginHistoryService {
  constructor(
    @InjectModel(LoginHistory.name) private readonly loginHistoryModel: Model<LoginHistoryDocument>,
  ) {}

  async getLoginHistory(
    filters: {
      userId?: string;
      email?: string;
      role?: string;
      status?: string;
      loginMethod?: string;
      fromDate?: Date;
      toDate?: Date;
    },
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const query: any = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.email) {
      query.email = { $regex: filters.email, $options: 'i' };
    }
    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.loginMethod) {
      query.loginMethod = filters.loginMethod;
    }
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        query.createdAt.$gte = filters.fromDate;
      }
      if (filters.toDate) {
        query.createdAt.$lte = filters.toDate;
      }
    }

    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'asc' ? 1 : -1;

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const [records, total] = await Promise.all([
      this.loginHistoryModel
        .find(query)
        .sort({ [sortField]: sortDirection })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.loginHistoryModel.countDocuments(query),
    ]);

    return {
      records,
      total,
      limit,
      offset,
      hasMore: offset + records.length < total,
    };
  }

  async getLoginStats(days: number = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const stats = await this.loginHistoryModel.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const methodStats = await this.loginHistoryModel.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate },
          status: 'success',
        },
      },
      {
        $group: {
          _id: '$loginMethod',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      totalAttempts: stats.reduce((sum, s) => sum + s.count, 0),
      successful: stats.find(s => s._id === 'success')?.count || 0,
      failed: stats.find(s => s._id === 'failed')?.count || 0,
      otpRequired: stats.find(s => s._id === 'otp_required')?.count || 0,
      byMethod: methodStats.reduce((acc, m) => {
        acc[m._id] = m.count;
        return acc;
      }, {}),
    };
  }

  async getUserLoginHistory(userId: string, limit: number = 50) {
    return this.loginHistoryModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async getRecentLogins(limit: number = 20) {
    return this.loginHistoryModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
