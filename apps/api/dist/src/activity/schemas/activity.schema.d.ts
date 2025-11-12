import { Document, Types } from 'mongoose';
export type ActivityDocument = Activity & Document;
export declare class Activity {
    shopId: Types.ObjectId;
    userId: Types.ObjectId;
    userName: string;
    userRole: 'admin' | 'cashier';
    action: string;
    details: {
        transactionId?: string;
        amount?: number;
        items?: number;
        paymentMethod?: string;
        productId?: string;
        productName?: string;
        quantity?: number;
        [key: string]: any;
    };
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
export declare const ActivitySchema: import("mongoose").Schema<Activity, import("mongoose").Model<Activity, any, any, any, Document<unknown, any, Activity, any, {}> & Activity & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Activity, Document<unknown, {}, import("mongoose").FlatRecord<Activity>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Activity> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
