import { HydratedDocument } from 'mongoose';
export type SuperAdminDocument = HydratedDocument<SuperAdmin>;
export declare class SuperAdmin {
    email: string;
    passwordHash: string;
    role: 'super_admin';
    status: 'active' | 'disabled';
}
export declare const SuperAdminSchema: import("mongoose").Schema<SuperAdmin, import("mongoose").Model<SuperAdmin, any, any, any, import("mongoose").Document<unknown, any, SuperAdmin, any, {}> & SuperAdmin & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SuperAdmin, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<SuperAdmin>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<SuperAdmin> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
