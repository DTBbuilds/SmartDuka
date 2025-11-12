import { Model } from 'mongoose';
import { ShopAuditLogDocument } from '../schemas/shop-audit-log.schema';
export interface CreateAuditLogDto {
    shopId: string;
    performedBy: string;
    action: 'verify' | 'reject' | 'suspend' | 'reactivate' | 'flag' | 'unflag' | 'update' | 'create';
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    reason?: string;
    notes?: string;
}
export declare class ShopAuditLogService {
    private readonly auditLogModel;
    private readonly logger;
    constructor(auditLogModel: Model<ShopAuditLogDocument>);
    create(dto: CreateAuditLogDto): Promise<ShopAuditLogDocument>;
    getShopAuditLog(shopId: string, limit?: number, skip?: number): Promise<ShopAuditLogDocument[]>;
    getAuditLogsByAction(shopId: string, action: string, limit?: number): Promise<ShopAuditLogDocument[]>;
    getAuditLogsByPerformer(performedBy: string, limit?: number): Promise<ShopAuditLogDocument[]>;
    getAuditLogCount(shopId: string): Promise<number>;
    getVerificationHistory(shopId: string): Promise<ShopAuditLogDocument[]>;
}
