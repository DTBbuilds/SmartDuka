import { SuperAdminService } from './super-admin.service';
export declare class SuperAdminController {
    private readonly superAdminService;
    constructor(superAdminService: SuperAdminService);
    getPendingShops(limit?: string, skip?: string): Promise<{
        shops: (import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    getVerifiedShops(limit?: string, skip?: string): Promise<{
        shops: (import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    getActiveShops(limit?: string, skip?: string): Promise<{
        shops: (import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    getSuspendedShops(limit?: string, skip?: string): Promise<{
        shops: (import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    getFlaggedShops(limit?: string, skip?: string): Promise<{
        shops: (import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    getAllShops(limit?: string, skip?: string, status?: string): Promise<{
        shops: (import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    getShopDetails(shopId: string): Promise<import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getShopStats(shopId: string): Promise<{
        id: import("mongoose").Types.ObjectId;
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
    getShopAuditLog(shopId: string, limit?: string, skip?: string): Promise<(import("mongoose").Document<unknown, {}, import("../shops/schemas/shop-audit-log.schema").ShopAuditLog, {}, {}> & import("../shops/schemas/shop-audit-log.schema").ShopAuditLog & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getVerificationHistory(shopId: string): Promise<(import("mongoose").Document<unknown, {}, import("../shops/schemas/shop-audit-log.schema").ShopAuditLog, {}, {}> & import("../shops/schemas/shop-audit-log.schema").ShopAuditLog & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    verifyShop(shopId: string, body: {
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    rejectShop(shopId: string, body: {
        reason: string;
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    suspendShop(shopId: string, body: {
        reason: string;
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    reactivateShop(shopId: string, body: {
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    flagShop(shopId: string, body: {
        reason: string;
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    unflagShop(shopId: string, body: {
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../shops/schemas/shop.schema").Shop, {}, {}> & import("../shops/schemas/shop.schema").Shop & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getDashboardStats(): Promise<{
        pending: number;
        verified: number;
        active: number;
        suspended: number;
        flagged: number;
        total: number;
    }>;
}
