import { Model } from 'mongoose';
import { AuditLogDocument } from './audit-log.schema';
export declare class AuditService {
    private readonly auditModel;
    private readonly logger;
    constructor(auditModel: Model<AuditLogDocument>);
    log(shopId: string, userId: string, action: string, resource: string, resourceId?: string, changes?: any, branchId?: string): Promise<AuditLogDocument>;
    getByShop(shopId: string, filters?: {
        action?: string;
        resource?: string;
        userId?: string;
        branchId?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<AuditLogDocument[]>;
    getByBranch(branchId: string, shopId: string, limit?: number): Promise<AuditLogDocument[]>;
    getByUser(userId: string, shopId: string, limit?: number): Promise<AuditLogDocument[]>;
    getByResource(resourceId: string, shopId: string, limit?: number): Promise<AuditLogDocument[]>;
    getStats(shopId: string): Promise<{
        totalLogs: number;
        actionCounts: {
            [key: string]: number;
        };
        resourceCounts: {
            [key: string]: number;
        };
        topUsers: Array<{
            userId: string;
            count: number;
        }>;
    }>;
}
