import { Model } from 'mongoose';
import { SupportTicketDocument } from './schemas/support-ticket.schema';
export interface CreateTicketDto {
    shopId: string;
    createdBy: string;
    subject: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}
export interface AddMessageDto {
    sender: string;
    message: string;
}
export declare class SupportService {
    private readonly ticketModel;
    private readonly logger;
    constructor(ticketModel: Model<SupportTicketDocument>);
    createTicket(dto: CreateTicketDto): Promise<SupportTicketDocument>;
    getTickets(filters?: {
        shopId?: string;
        status?: string;
        priority?: string;
        assignedTo?: string;
    }, limit?: number, skip?: number): Promise<SupportTicketDocument[]>;
    getTicketById(ticketId: string): Promise<SupportTicketDocument>;
    getShopTickets(shopId: string, limit?: number, skip?: number): Promise<SupportTicketDocument[]>;
    addMessage(ticketId: string, dto: AddMessageDto): Promise<SupportTicketDocument>;
    updateStatus(ticketId: string, status: 'open' | 'in-progress' | 'resolved' | 'closed', resolutionNotes?: string): Promise<SupportTicketDocument>;
    assignTicket(ticketId: string, assignedTo: string): Promise<SupportTicketDocument>;
    getOpenTicketsCount(): Promise<number>;
    getShopOpenTicketsCount(shopId: string): Promise<number>;
    getAssignedTicketsCount(assignedTo: string): Promise<number>;
}
