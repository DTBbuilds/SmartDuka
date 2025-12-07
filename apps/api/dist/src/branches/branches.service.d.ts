import { Model } from 'mongoose';
import { BranchDocument } from './branch.schema';
import { AuditLogDocument } from '../audit/audit-log.schema';
import { SubscriptionGuardService } from '../subscriptions/subscription-guard.service';
export interface CreateBranchDto {
    name: string;
    code: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    inventoryType?: 'shared' | 'separate';
    canTransferStock?: boolean;
    openingTime?: string;
    closingTime?: string;
    timezone?: string;
    paymentConfig?: {
        enabled?: boolean;
        useShopConfig?: boolean;
        type?: 'paybill' | 'till';
        shortCode?: string;
        accountPrefix?: string;
        consumerKey?: string;
        consumerSecret?: string;
        passkey?: string;
    };
    location?: {
        county?: string;
        subCounty?: string;
        ward?: string;
        landmark?: string;
        buildingName?: string;
        floor?: string;
        latitude?: number;
        longitude?: number;
        googleMapsUrl?: string;
        deliveryRadius?: number;
    };
    operations?: {
        operatingHours?: Record<number, {
            open: string;
            close: string;
            closed?: boolean;
        }>;
        holidays?: string[];
        acceptsWalkIn?: boolean;
        acceptsDelivery?: boolean;
        acceptsPickup?: boolean;
        deliveryFee?: number;
        minimumOrderAmount?: number;
        maxDailyOrders?: number;
        averageServiceTime?: number;
        receiptHeader?: string;
        receiptFooter?: string;
        receiptLogo?: string;
    };
    contacts?: {
        primaryPhone?: string;
        secondaryPhone?: string;
        whatsapp?: string;
        email?: string;
        supportEmail?: string;
    };
    managerId?: string;
    maxStaff?: number;
    targetRevenue?: number;
    costCenter?: string;
    taxExempt?: boolean;
    metadata?: Record<string, any>;
}
export interface UpdateBranchDto {
    name?: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    status?: 'active' | 'inactive' | 'suspended';
    inventoryType?: 'shared' | 'separate';
    canTransferStock?: boolean;
    openingTime?: string;
    closingTime?: string;
    timezone?: string;
    paymentConfig?: {
        enabled?: boolean;
        useShopConfig?: boolean;
        type?: 'paybill' | 'till';
        shortCode?: string;
        accountPrefix?: string;
        consumerKey?: string;
        consumerSecret?: string;
        passkey?: string;
    };
    location?: {
        county?: string;
        subCounty?: string;
        ward?: string;
        landmark?: string;
        buildingName?: string;
        floor?: string;
        latitude?: number;
        longitude?: number;
        googleMapsUrl?: string;
        deliveryRadius?: number;
    };
    operations?: {
        operatingHours?: Record<number, {
            open: string;
            close: string;
            closed?: boolean;
        }>;
        holidays?: string[];
        acceptsWalkIn?: boolean;
        acceptsDelivery?: boolean;
        acceptsPickup?: boolean;
        deliveryFee?: number;
        minimumOrderAmount?: number;
        maxDailyOrders?: number;
        averageServiceTime?: number;
        receiptHeader?: string;
        receiptFooter?: string;
        receiptLogo?: string;
    };
    contacts?: {
        primaryPhone?: string;
        secondaryPhone?: string;
        whatsapp?: string;
        email?: string;
        supportEmail?: string;
    };
    managerId?: string;
    maxStaff?: number;
    targetRevenue?: number;
    costCenter?: string;
    taxExempt?: boolean;
    metadata?: Record<string, any>;
}
export declare class BranchesService {
    private readonly branchModel;
    private readonly auditModel;
    private readonly subscriptionGuard;
    private readonly logger;
    constructor(branchModel: Model<BranchDocument>, auditModel: Model<AuditLogDocument>, subscriptionGuard: SubscriptionGuardService);
    create(shopId: string, userId: string, dto: CreateBranchDto): Promise<BranchDocument>;
    findByShop(shopId: string): Promise<BranchDocument[]>;
    findById(branchId: string, shopId: string): Promise<BranchDocument | null>;
    findByCode(code: string, shopId: string): Promise<BranchDocument | null>;
    update(branchId: string, shopId: string, userId: string, dto: UpdateBranchDto): Promise<BranchDocument | null>;
    delete(branchId: string, shopId: string, userId: string): Promise<boolean>;
    countByShop(shopId: string): Promise<number>;
    getActive(shopId: string): Promise<BranchDocument[]>;
    getBranchesWithPaymentConfig(shopId: string): Promise<BranchDocument[]>;
    updatePaymentConfig(branchId: string, shopId: string, userId: string, paymentConfig: CreateBranchDto['paymentConfig']): Promise<BranchDocument | null>;
    getPaymentConfigStatus(branchId: string, shopId: string): Promise<{
        hasOwnConfig: boolean;
        usesShopConfig: boolean;
        isConfigured: boolean;
        isVerified: boolean;
        shortCode?: string;
        type?: string;
    }>;
    assignManager(branchId: string, shopId: string, userId: string, managerId: string): Promise<BranchDocument | null>;
    addStaff(branchId: string, shopId: string, userId: string, staffId: string): Promise<BranchDocument | null>;
    removeStaff(branchId: string, shopId: string, userId: string, staffId: string): Promise<BranchDocument | null>;
    getByCounty(shopId: string, county: string): Promise<BranchDocument[]>;
    getDeliveryBranches(shopId: string): Promise<BranchDocument[]>;
}
