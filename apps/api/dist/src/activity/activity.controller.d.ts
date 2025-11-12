import { ActivityService } from './activity.service';
export declare class ActivityController {
    private readonly activityService;
    constructor(activityService: ActivityService);
    getShopActivityLog(limit: string | undefined, skip: string | undefined, user: any): Promise<import("./schemas/activity.schema").ActivityDocument[]>;
    getOwnTransactions(limit: string | undefined, user: any): Promise<import("./schemas/activity.schema").ActivityDocument[]>;
    getCashierActivityLog(cashierId: string, limit: string | undefined, skip: string | undefined, user: any): Promise<import("./schemas/activity.schema").ActivityDocument[]>;
    getCashierTransactions(cashierId: string, limit: string | undefined, user: any): Promise<import("./schemas/activity.schema").ActivityDocument[]>;
    getTodayActivity(user: any): Promise<import("./schemas/activity.schema").ActivityDocument[]>;
    getActivityByAction(action: string, limit: string | undefined, user: any): Promise<import("./schemas/activity.schema").ActivityDocument[]>;
    getCashierSessions(cashierId: string, limit: string | undefined, user: any): Promise<import("./schemas/activity.schema").ActivityDocument[]>;
    logActivity(dto: {
        action: string;
        details?: Record<string, any>;
    }, user: any): Promise<{
        success: boolean;
        activity: import("./schemas/activity.schema").ActivityDocument | null;
    }>;
    updateStatus(dto: {
        status: 'online' | 'idle' | 'offline';
        timestamp?: string;
    }, user: any): Promise<{
        success: boolean;
        status: "online" | "idle" | "offline";
    }>;
    heartbeat(dto: {
        status?: 'online' | 'idle' | 'offline';
        timestamp?: string;
    }, user: any): Promise<{
        success: boolean;
        timestamp: string;
    }>;
}
