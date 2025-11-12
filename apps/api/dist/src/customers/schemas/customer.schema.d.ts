import { Document, Types } from 'mongoose';
export type CustomerDocument = Customer & Document;
export declare class CustomerPreferences {
    favoriteProducts?: Types.ObjectId[];
    preferredPaymentMethod?: string;
    notes?: string;
}
export declare const CustomerPreferencesSchema: import("mongoose").Schema<CustomerPreferences, import("mongoose").Model<CustomerPreferences, any, any, any, Document<unknown, any, CustomerPreferences, any, {}> & CustomerPreferences & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CustomerPreferences, Document<unknown, {}, import("mongoose").FlatRecord<CustomerPreferences>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<CustomerPreferences> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class ContactPreferences {
    sms?: boolean;
    email?: boolean;
}
export declare const ContactPreferencesSchema: import("mongoose").Schema<ContactPreferences, import("mongoose").Model<ContactPreferences, any, any, any, Document<unknown, any, ContactPreferences, any, {}> & ContactPreferences & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ContactPreferences, Document<unknown, {}, import("mongoose").FlatRecord<ContactPreferences>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ContactPreferences> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Customer {
    shopId: Types.ObjectId;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    totalPurchases: number;
    totalSpent: number;
    lastPurchaseDate?: Date;
    lastVisit?: Date;
    segment?: 'vip' | 'regular' | 'inactive';
    preferences?: CustomerPreferences;
    contactPreferences?: ContactPreferences;
    status: string;
}
export declare const CustomerSchema: import("mongoose").Schema<Customer, import("mongoose").Model<Customer, any, any, any, Document<unknown, any, Customer, any, {}> & Customer & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Customer, Document<unknown, {}, import("mongoose").FlatRecord<Customer>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Customer> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
