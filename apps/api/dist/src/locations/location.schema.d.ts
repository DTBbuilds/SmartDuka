import { HydratedDocument, Types } from 'mongoose';
export type LocationDocument = HydratedDocument<Location>;
export declare class Location {
    shopId: Types.ObjectId;
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    status: 'active' | 'inactive';
    isHeadquarters: boolean;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    settings?: Record<string, any>;
}
export declare const LocationSchema: import("mongoose").Schema<Location, import("mongoose").Model<Location, any, any, any, import("mongoose").Document<unknown, any, Location, any, {}> & Location & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Location, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Location>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Location> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
