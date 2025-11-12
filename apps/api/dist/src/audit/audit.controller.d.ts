import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getLogs(user: any, action?: string, resource?: string, userId?: string, branchId?: string, limit?: string): Promise<import("./audit-log.schema").AuditLogDocument[]>;
    getBranchLogs(branchId: string, user: any, limit?: string): Promise<import("./audit-log.schema").AuditLogDocument[]>;
    getUserLogs(userId: string, user: any, limit?: string): Promise<import("./audit-log.schema").AuditLogDocument[]>;
    getResourceLogs(resourceId: string, user: any, limit?: string): Promise<import("./audit-log.schema").AuditLogDocument[]>;
    getStats(user: any): Promise<{
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
