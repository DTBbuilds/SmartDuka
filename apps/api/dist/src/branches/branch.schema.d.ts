import { Document, Types } from 'mongoose';
export type BranchDocument = Branch & Document;
export declare class BranchPaymentConfig {
    enabled?: boolean;
    useShopConfig?: boolean;
    paymentConfigId?: Types.ObjectId;
    type?: 'paybill' | 'till';
    shortCode?: string;
    accountPrefix?: string;
    consumerKey?: string;
    consumerKeyIv?: string;
    consumerKeyTag?: string;
    consumerSecret?: string;
    consumerSecretIv?: string;
    consumerSecretTag?: string;
    passkey?: string;
    passkeyIv?: string;
    passkeyTag?: string;
    callbackUrl?: string;
    verificationStatus?: 'pending' | 'verified' | 'failed';
    verifiedAt?: Date;
}
export declare class BranchLocation {
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
}
export declare class BranchOperations {
    operatingHours?: {
        [day: number]: {
            open: string;
            close: string;
            closed?: boolean;
        };
    };
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
}
export declare class BranchContacts {
    primaryPhone?: string;
    secondaryPhone?: string;
    whatsapp?: string;
    email?: string;
    supportEmail?: string;
}
export declare class Branch {
    shopId: Types.ObjectId;
    name: string;
    code: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    createdBy: Types.ObjectId;
    status: 'active' | 'inactive' | 'suspended';
    inventoryType: 'shared' | 'separate';
    canTransferStock?: boolean;
    warehouseId?: Types.ObjectId;
    paymentConfig?: BranchPaymentConfig;
    location?: BranchLocation;
    openingTime?: string;
    closingTime?: string;
    timezone?: string;
    operations?: BranchOperations;
    contacts?: BranchContacts;
    managerId?: Types.ObjectId;
    staffIds?: Types.ObjectId[];
    maxStaff?: number;
    targetRevenue?: number;
    costCenter?: string;
    taxExempt?: boolean;
    metadata?: {
        manager?: Types.ObjectId;
        managerName?: string;
        managerPhone?: string;
        notes?: string;
        customFields?: Record<string, any>;
        [key: string]: any;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const BranchSchema: import("mongoose").Schema<Branch, import("mongoose").Model<Branch, any, any, any, Document<unknown, any, Branch, any, {}> & Branch & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Branch, Document<unknown, {}, import("mongoose").FlatRecord<Branch>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Branch> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
