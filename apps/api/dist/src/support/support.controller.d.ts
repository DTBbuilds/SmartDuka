import { SupportService } from './support.service';
export declare class SupportController {
    private readonly supportService;
    constructor(supportService: SupportService);
    createTicket(body: {
        subject: string;
        description: string;
        priority?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getShopTickets(limit: string | undefined, skip: string | undefined, user: any): Promise<{
        tickets: (import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    getTicketById(ticketId: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    addMessage(ticketId: string, body: {
        message: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAllTickets(status?: string, priority?: string, limit?: string, skip?: string): Promise<{
        tickets: (import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
    updateTicketStatus(ticketId: string, body: {
        status: string;
        resolutionNotes?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    assignTicket(ticketId: string, body: {
        assignedTo: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAssignedTickets(limit: string | undefined, skip: string | undefined, user: any): Promise<{
        tickets: (import("mongoose").Document<unknown, {}, import("./schemas/support-ticket.schema").SupportTicket, {}, {}> & import("./schemas/support-ticket.schema").SupportTicket & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        count: number;
    }>;
}
