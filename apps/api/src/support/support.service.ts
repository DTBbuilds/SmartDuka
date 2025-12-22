import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupportTicket, SupportTicketDocument } from './schemas/support-ticket.schema';
import { Conversation, ConversationDocument } from '../messaging/schemas/conversation.schema';
import { Message, MessageDocument } from '../messaging/schemas/message.schema';

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

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(SupportTicket.name) private readonly ticketModel: Model<SupportTicketDocument>,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Create a support ticket
   * Also creates a conversation in the messaging system for inbox integration
   */
  async createTicket(dto: CreateTicketDto): Promise<SupportTicketDocument> {
    try {
      const ticket = new this.ticketModel({
        shopId: new Types.ObjectId(dto.shopId),
        createdBy: new Types.ObjectId(dto.createdBy),
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority || 'medium',
        status: 'open',
        messages: [
          {
            sender: new Types.ObjectId(dto.createdBy),
            message: dto.description,
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const savedTicket = await ticket.save();

      // Also create a conversation in the messaging system for inbox integration
      try {
        const conversation = new this.conversationModel({
          shopId: new Types.ObjectId(dto.shopId),
          adminUserId: new Types.ObjectId(dto.createdBy),
          subject: `[Support] ${dto.subject}`,
          type: 'support',
          priority: dto.priority || 'normal',
          status: 'open',
          unreadCountSuperAdmin: 1,
        });
        const savedConversation = await conversation.save();

        // Create the initial message
        const message = new this.messageModel({
          conversationId: savedConversation._id,
          senderId: new Types.ObjectId(dto.createdBy),
          senderType: 'admin',
          content: dto.description,
          status: 'sent',
        });
        const savedMessage = await message.save();

        // Update conversation with last message info
        await this.conversationModel.findByIdAndUpdate(savedConversation._id, {
          lastMessageId: savedMessage._id,
          lastMessageAt: new Date(),
          lastMessagePreview: dto.description.substring(0, 100),
        });

        this.logger.log(`Created inbox conversation for support ticket ${savedTicket._id}`);
      } catch (msgError: any) {
        // Don't fail the ticket creation if messaging fails
        this.logger.warn(`Failed to create inbox conversation: ${msgError.message}`);
      }

      return savedTicket;
    } catch (error) {
      this.logger.error(`Failed to create support ticket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all support tickets
   */
  async getTickets(
    filters?: {
      shopId?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
    },
    limit: number = 50,
    skip: number = 0,
  ): Promise<SupportTicketDocument[]> {
    const query: any = {};

    if (filters?.shopId) {
      query.shopId = new Types.ObjectId(filters.shopId);
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.priority) {
      query.priority = filters.priority;
    }
    if (filters?.assignedTo) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }

    return this.ticketModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SupportTicketDocument> {
    const ticket = await this.ticketModel.findById(new Types.ObjectId(ticketId)).exec();
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return ticket;
  }

  /**
   * Get shop tickets
   */
  async getShopTickets(
    shopId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<SupportTicketDocument[]> {
    return this.ticketModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Add message to ticket
   */
  async addMessage(ticketId: string, dto: AddMessageDto): Promise<SupportTicketDocument> {
    const ticket = await this.getTicketById(ticketId);

    const updatedTicket = await this.ticketModel
      .findByIdAndUpdate(
        new Types.ObjectId(ticketId),
        {
          $push: {
            messages: {
              sender: new Types.ObjectId(dto.sender),
              message: dto.message,
              createdAt: new Date(),
            },
          },
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Message added to ticket ${ticketId}`);
    if (!updatedTicket) {
      throw new NotFoundException('Support ticket not found after update');
    }
    return updatedTicket;
  }

  /**
   * Update ticket status
   */
  async updateStatus(
    ticketId: string,
    status: 'open' | 'in-progress' | 'resolved' | 'closed',
    resolutionNotes?: string,
  ): Promise<SupportTicketDocument> {
    const ticket = await this.getTicketById(ticketId);

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
    }

    const updatedTicket = await this.ticketModel
      .findByIdAndUpdate(new Types.ObjectId(ticketId), updateData, { new: true })
      .exec();

    this.logger.log(`Ticket ${ticketId} status updated to ${status}`);
    if (!updatedTicket) {
      throw new NotFoundException('Support ticket not found after update');
    }
    return updatedTicket;
  }

  /**
   * Assign ticket to super admin
   */
  async assignTicket(ticketId: string, assignedTo: string): Promise<SupportTicketDocument> {
    const ticket = await this.getTicketById(ticketId);

    const updatedTicket = await this.ticketModel
      .findByIdAndUpdate(
        new Types.ObjectId(ticketId),
        {
          assignedTo: new Types.ObjectId(assignedTo),
          status: 'in-progress',
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Ticket ${ticketId} assigned to ${assignedTo}`);
    if (!updatedTicket) {
      throw new NotFoundException('Support ticket not found after update');
    }
    return updatedTicket;
  }

  /**
   * Get open tickets count
   */
  async getOpenTicketsCount(): Promise<number> {
    return this.ticketModel.countDocuments({ status: 'open' });
  }

  /**
   * Get shop open tickets count
   */
  async getShopOpenTicketsCount(shopId: string): Promise<number> {
    return this.ticketModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
      status: 'open',
    });
  }

  /**
   * Get assigned tickets count
   */
  async getAssignedTicketsCount(assignedTo: string): Promise<number> {
    return this.ticketModel.countDocuments({
      assignedTo: new Types.ObjectId(assignedTo),
      status: { $in: ['open', 'in-progress'] },
    });
  }
}
