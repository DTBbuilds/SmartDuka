import { Model } from 'mongoose';
import { ActivityDocument } from './schemas/activity.schema';
export declare class ActivityService {
    private readonly activityModel;
    private readonly logger;
    constructor(activityModel: Model<ActivityDocument>);
    logActivity(shopId: string, userId: string, userName: string, userRole: 'admin' | 'cashier' | 'super_admin', action: string, details?: any, ipAddress?: string, userAgent?: string): Promise<ActivityDocument | null>;
    getShopActivityLog(shopId: string, limit?: number, skip?: number): Promise<ActivityDocument[]>;
    getCashierActivityLog(shopId: string, cashierId: string, limit?: number, skip?: number): Promise<ActivityDocument[]>;
    getShopActivityCount(shopId: string): Promise<number>;
    getActivityByAction(shopId: string, action: string, limit?: number): Promise<ActivityDocument[]>;
    getCashierTransactions(shopId: string, cashierId: string, limit?: number): Promise<ActivityDocument[]>;
    getTodayActivity(shopId: string): Promise<ActivityDocument[]>;
    getCashierSessions(shopId: string, cashierId: string, limit?: number): Promise<ActivityDocument[]>;
    cleanupOldLogs(): Promise<any>;
}
