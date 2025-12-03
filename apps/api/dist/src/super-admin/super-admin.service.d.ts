import { Model, Types } from 'mongoose';
import { ShopDocument } from '../shops/schemas/shop.schema';
import { ShopAuditLogService } from '../shops/services/shop-audit-log.service';
export declare class SuperAdminService {
    private readonly shopModel;
    private readonly auditLogService;
    private readonly logger;
    constructor(shopModel: Model<ShopDocument>, auditLogService: ShopAuditLogService);
    getPendingShops(limit?: number, skip?: number): Promise<ShopDocument[]>;
    getVerifiedShops(limit?: number, skip?: number): Promise<ShopDocument[]>;
    getActiveShops(limit?: number, skip?: number): Promise<ShopDocument[]>;
    getSuspendedShops(limit?: number, skip?: number): Promise<ShopDocument[]>;
    getFlaggedShops(limit?: number, skip?: number): Promise<ShopDocument[]>;
    getAllShops(limit?: number, skip?: number, status?: string): Promise<ShopDocument[]>;
    getAllShopsCount(status?: string): Promise<number>;
    getShopDetails(shopId: string): Promise<ShopDocument>;
    verifyShop(shopId: string, superAdminId: string, notes?: string): Promise<ShopDocument>;
    rejectShop(shopId: string, superAdminId: string, reason: string, notes?: string): Promise<ShopDocument>;
    suspendShop(shopId: string, superAdminId: string, reason: string, notes?: string): Promise<ShopDocument>;
    reactivateShop(shopId: string, superAdminId: string, notes?: string): Promise<ShopDocument>;
    flagShop(shopId: string, superAdminId: string, reason: string, notes?: string): Promise<ShopDocument>;
    unflagShop(shopId: string, superAdminId: string, notes?: string): Promise<ShopDocument>;
    getShopAuditLog(shopId: string, limit?: number, skip?: number): Promise<(import("mongoose").Document<unknown, {}, import("../shops/schemas/shop-audit-log.schema").ShopAuditLog, {}, {}> & import("../shops/schemas/shop-audit-log.schema").ShopAuditLog & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getVerificationHistory(shopId: string): Promise<(import("mongoose").Document<unknown, {}, import("../shops/schemas/shop-audit-log.schema").ShopAuditLog, {}, {}> & import("../shops/schemas/shop-audit-log.schema").ShopAuditLog & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getShopStats(shopId: string): Promise<{
        id: Types.ObjectId;
        name: string;
        email: string;
        phone: string;
        status: "active" | "pending" | "verified" | "suspended" | "rejected" | "flagged";
        complianceScore: number;
        chargebackRate: number;
        refundRate: number;
        violationCount: number;
        cashierCount: number;
        totalSales: number;
        totalOrders: number;
        lastActivityDate: Date | undefined;
        isFlagged: boolean;
        isMonitored: boolean;
        verificationDate: Date | undefined;
        suspensionDate: Date | undefined;
        createdAt: any;
        updatedAt: any;
    }>;
    getPendingShopsCount(): Promise<number>;
    getFlaggedShopsCount(): Promise<number>;
    getSuspendedShopsCount(): Promise<number>;
    getVerifiedShopsCount(): Promise<number>;
    getActiveShopsCount(): Promise<number>;
}
