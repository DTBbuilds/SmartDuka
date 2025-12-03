import { Document } from 'mongoose';
export declare class ShopSettings extends Document {
    shopId: string;
    tax: {
        enabled: boolean;
        rate: number;
        name: string;
        description: string;
        appliedByDefault: boolean;
    };
    taxExemptProducts: string[];
    categoryTaxRates: Record<string, {
        rate: number;
        exempt: boolean;
    }>;
    receipt: {
        shopName?: string;
        shopAddress?: string;
        shopPhone?: string;
        shopEmail?: string;
        shopLogo?: string;
        shopTaxPin?: string;
        shopWebsite?: string;
        printerWidth: number;
        showLogo: boolean;
        showTaxPin: boolean;
        showCashierName: boolean;
        showCustomerName: boolean;
        showItemSku: boolean;
        headerMessage?: string;
        footerMessage: string;
        socialMedia?: {
            facebook?: string;
            instagram?: string;
            twitter?: string;
            whatsapp?: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShopSettingsSchema: import("mongoose").Schema<ShopSettings, import("mongoose").Model<ShopSettings, any, any, any, Document<unknown, any, ShopSettings, any, {}> & ShopSettings & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ShopSettings, Document<unknown, {}, import("mongoose").FlatRecord<ShopSettings>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ShopSettings> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
