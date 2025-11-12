import { HydratedDocument, Types } from 'mongoose';
export type ReceiptTemplateDocument = HydratedDocument<ReceiptTemplate>;
export declare class ReceiptTemplate {
    shopId: Types.ObjectId;
    name: string;
    header: string;
    footer?: string;
    companyName?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    showItemDetails: boolean;
    showTaxBreakdown: boolean;
    showQRCode: boolean;
    qrCodeContent?: string;
    showThankYouMessage: boolean;
    thankYouMessage?: string;
    status: 'active' | 'inactive';
    isDefault: boolean;
}
export declare const ReceiptTemplateSchema: import("mongoose").Schema<ReceiptTemplate, import("mongoose").Model<ReceiptTemplate, any, any, any, import("mongoose").Document<unknown, any, ReceiptTemplate, any, {}> & ReceiptTemplate & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReceiptTemplate, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ReceiptTemplate>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ReceiptTemplate> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
