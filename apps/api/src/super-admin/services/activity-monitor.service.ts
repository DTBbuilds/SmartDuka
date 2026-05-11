import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { LoginHistory, LoginHistoryDocument } from '../../auth/schemas/login-history.schema';
import { TokenService } from '../../auth/token.service';

export interface ActiveSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  shopId: string;
  shopName: string;
  sessionId: string;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

export interface ShopActivity {
  shopId: string;
  shopName: string;
  email: string;
  status: 'active' | 'idle' | 'offline';
  lastLogin: Date;
  activeUsers: number;
  totalUsers: number;
  recentLogins: number;
}

export interface ActivityStats {
  totalActiveShops: number;
  totalActiveUsers: number;
  totalLoginsToday: number;
  totalLoginsThisWeek: number;
  topActiveShops: ShopActivity[];
  recentLogins: any[];
  loginMethodStats: {
    password: number;
    google: number;
    pin: number;
  };
}

@Injectable()
export class ActivityMonitorService {
  private readonly logger = new Logger(ActivityMonitorService.name);
  private activeSessions = new Map<string, ActiveSession>();
  private shopActivities = new Map<string, ShopActivity>();
  private lastCleanup = new Date();

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    @InjectModel(LoginHistory.name) private readonly loginHistoryModel: Model<LoginHistoryDocument>,
    private readonly tokenService: TokenService,
  ) {
    // Initialize activity monitoring
    this.initializeActivityTracking();
  }

  private async initializeActivityTracking() {
    // Load existing active sessions from token service
    await this.refreshActiveSessions();
    await this.refreshShopActivities();
    this.logger.log('Activity monitoring initialized');
  }

  async refreshActiveSessions(): Promise<void> {
    try {
      // Get all active sessions from token service
      const sessions = await this.tokenService.getAllActiveSessions();
      
      // Clear current map
      this.activeSessions.clear();
      
      // Process each session
      for (const session of sessions) {
        // Get user details
        const user = await this.userModel.findById(session.userId).populate('shopId').exec();
        if (user && user.status === 'active') {
          const shop = user.shopId as any;
          this.activeSessions.set(session.sessionId, {
            userId: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
            role: user.role,
            shopId: user.shopId.toString(),
            shopName: shop?.name || 'Unknown Shop',
            sessionId: session.sessionId,
            lastActivity: session.lastActivityAt || new Date(),
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            deviceInfo: `${session.browser || 'Unknown'} on ${session.os || 'Unknown'}`,
          });
        }
      }
      
      this.logger.log(`Refreshed ${this.activeSessions.size} active sessions`);
    } catch (error) {
      this.logger.error('Failed to refresh active sessions:', error);
    }
  }

  async refreshShopActivities(): Promise<void> {
    try {
      // Get all active shops
      const shops = await this.shopModel.find({ status: 'active' }).exec();
      
      // Clear current map
      this.shopActivities.clear();
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      for (const shop of shops) {
        // Count active users for this shop
        const activeUsers = Array.from(this.activeSessions.values())
          .filter(session => session.shopId === shop._id.toString()).length;
        
        // Get total users for this shop
        const totalUsers = await this.userModel.countDocuments({ 
          shopId: shop._id, 
          status: 'active' 
        }).exec();
        
        // Get recent logins (last hour)
        const recentLogins = await this.loginHistoryModel.countDocuments({
          shopId: shop._id,
          status: 'success',
          createdAt: { $gte: oneHourAgo }
        }).exec();
        
        // Get last login time
        const lastLoginEntry = await this.loginHistoryModel
          .findOne({ shopId: shop._id, status: 'success' })
          .sort({ createdAt: -1 })
          .exec();
        
        // Determine shop status
        let status: 'active' | 'idle' | 'offline' = 'offline';
        if (activeUsers > 0) {
          status = 'active';
        } else if (lastLoginEntry && lastLoginEntry.createdAt > oneHourAgo) {
          status = 'idle';
        }
        
        this.shopActivities.set(shop._id.toString(), {
          shopId: shop._id.toString(),
          shopName: shop.name,
          email: shop.email,
          status,
          lastLogin: lastLoginEntry?.createdAt || new Date(0),
          activeUsers,
          totalUsers,
          recentLogins,
        });
      }
      
      this.logger.log(`Refreshed activity for ${this.shopActivities.size} shops`);
    } catch (error) {
      this.logger.error('Failed to refresh shop activities:', error);
    }
  }

  async getActivityStats(): Promise<ActivityStats> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get login statistics
      const loginsToday = await this.loginHistoryModel.countDocuments({
        status: 'success',
        createdAt: { $gte: today }
      }).exec();
      
      const loginsThisWeek = await this.loginHistoryModel.countDocuments({
        status: 'success',
        createdAt: { $gte: weekAgo }
      }).exec();
      
      // Get login method stats
      const loginMethodStats = await this.loginHistoryModel.aggregate([
        {
          $match: {
            status: 'success',
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: '$loginMethod',
            count: { $sum: 1 }
          }
        }
      ]).exec();
      
      const methodStats = { password: 0, google: 0, pin: 0 };
      loginMethodStats.forEach(stat => {
        methodStats[stat._id as keyof typeof methodStats] = stat.count;
      });
      
      // Get recent logins
      const recentLogins = await this.loginHistoryModel
        .find({ status: 'success' })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('userId', 'name email')
        .exec();
      
      // Get top active shops
      const topActiveShops = Array.from(this.shopActivities.values())
        .sort((a, b) => b.activeUsers - a.activeUsers)
        .slice(0, 10);
      
      return {
        totalActiveShops: this.shopActivities.size,
        totalActiveUsers: this.activeSessions.size,
        totalLoginsToday: loginsToday,
        totalLoginsThisWeek: loginsThisWeek,
        topActiveShops,
        recentLogins,
        loginMethodStats: methodStats,
      };
    } catch (error) {
      this.logger.error('Failed to get activity stats:', error);
      throw error;
    }
  }

  async getShopActivity(shopId: string): Promise<ShopActivity | null> {
    return this.shopActivities.get(shopId) || null;
  }

  async getAllShopActivities(): Promise<ShopActivity[]> {
    return Array.from(this.shopActivities.values());
  }

  async getActiveSessions(): Promise<ActiveSession[]> {
    return Array.from(this.activeSessions.values());
  }

  async getActiveSessionsForShop(shopId: string): Promise<ActiveSession[]> {
    return Array.from(this.activeSessions.values())
      .filter(session => session.shopId === shopId);
  }

  // Update activity when user logs in
  async onUserLogin(userId: string, sessionId: string, shopId: string): Promise<void> {
    try {
      const user = await this.userModel.findById(userId).populate('shopId').exec();
      if (!user) return;
      
      const shop = user.shopId as any;
      const session = await this.tokenService.getSessionById(sessionId);
      
      if (session) {
        this.activeSessions.set(sessionId, {
          userId: user._id.toString(),
          email: user.email,
          name: user.name || user.email,
          role: user.role,
          shopId: user.shopId.toString(),
          shopName: shop?.name || 'Unknown Shop',
          sessionId: sessionId,
          lastActivity: session.lastActivityAt || new Date(),
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          deviceInfo: `${session.browser || 'Unknown'} on ${session.os || 'Unknown'}`,
        });
      }
      
      // Update shop activity
      await this.refreshShopActivities();
    } catch (error) {
      this.logger.error('Failed to update user login activity:', error);
    }
  }

  // Update activity when user logs out
  async onUserLogout(sessionId: string): Promise<void> {
    try {
      this.activeSessions.delete(sessionId);
      await this.refreshShopActivities();
    } catch (error) {
      this.logger.error('Failed to update user logout activity:', error);
    }
  }

  // Clean up stale data every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupStaleData(): Promise<void> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Remove sessions inactive for more than 1 hour
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.lastActivity < oneHourAgo) {
          this.activeSessions.delete(sessionId);
        }
      }
      
      // Refresh shop activities
      await this.refreshShopActivities();
      
      this.lastCleanup = now;
      this.logger.log(`Cleanup completed. Active sessions: ${this.activeSessions.size}`);
    } catch (error) {
      this.logger.error('Failed to cleanup stale data:', error);
    }
  }
}
