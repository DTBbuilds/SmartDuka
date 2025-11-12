import { HydratedDocument, Types } from 'mongoose';
export type SupportTicketDocument = HydratedDocument<SupportTicket>;
export declare class SupportTicketMessage {
    sender: Types.ObjectId;
    message: string;
    createdAt: Date;
}
export declare class SupportTicket {
    shopId: Types.ObjectId;
    createdBy: Types.ObjectId;
    subject: string;
    description: string;
    status: string;
    priority: string;
    assignedTo?: Types.ObjectId;
    messages: SupportTicketMessage[];
    resolvedAt?: Date;
    resolutionNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SupportTicketSchema: import("mongoose").Schema<SupportTicket, import("mongoose").Model<SupportTicket, any, any, any, import("mongoose").Document<unknown, any, SupportTicket, any, {}> & SupportTicket & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SupportTicket, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<SupportTicket>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<SupportTicket> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
