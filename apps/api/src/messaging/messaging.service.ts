import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateConversationDto, SendMessageDto, UpdateConversationDto } from './dto/messaging.dto';

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  // Create a new conversation (shop admin initiates)
  async createConversation(
    shopId: string,
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationDocument> {
    const conversation = new this.conversationModel({
      shopId: new Types.ObjectId(shopId),
      adminUserId: new Types.ObjectId(userId),
      subject: dto.subject,
      type: dto.type || 'general',
      priority: dto.priority || 'normal',
      status: 'open',
      unreadCountSuperAdmin: dto.initialMessage ? 1 : 0,
    });

    const saved = await conversation.save();

    // If there's an initial message, create it
    if (dto.initialMessage) {
      await this.sendMessage(shopId, userId, 'admin', {
        conversationId: (saved._id as any).toString(),
        content: dto.initialMessage,
      });
    }

    return saved;
  }

  // Send a message
  async sendMessage(
    shopId: string,
    senderId: string,
    senderType: 'admin' | 'super_admin',
    dto: SendMessageDto,
  ): Promise<MessageDocument> {
    const conversation = await this.conversationModel.findById(dto.conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify access
    if (senderType === 'admin' && conversation.shopId.toString() !== shopId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: new Types.ObjectId(senderId),
      senderType,
      content: dto.content,
      attachments: dto.attachments || [],
      status: 'sent',
    });

    const saved = await message.save();

    // Update conversation with last message info
    const updateData: any = {
      lastMessageId: saved._id,
      lastMessageAt: new Date(),
      lastMessagePreview: dto.content.substring(0, 100),
      status: conversation.status === 'resolved' ? 'open' : conversation.status,
    };

    // Increment unread count for the other party
    if (senderType === 'admin') {
      updateData.$inc = { unreadCountSuperAdmin: 1 };
    } else {
      updateData.$inc = { unreadCountAdmin: 1 };
    }

    await this.conversationModel.findByIdAndUpdate(dto.conversationId, updateData);

    return saved;
  }

  // Get conversations for shop admin
  async getAdminConversations(
    shopId: string,
    options: { status?: string; page?: number; limit?: number } = {},
  ) {
    const { status, page = 1, limit = 20 } = options;
    const query: any = { shopId: new Types.ObjectId(shopId) };
    if (status) query.status = status;

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(query)
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.conversationModel.countDocuments(query),
    ]);

    return { conversations, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // Get conversations for super admin
  async getSuperAdminConversations(
    options: { status?: string; priority?: string; page?: number; limit?: number } = {},
  ) {
    const { status, priority, page = 1, limit = 20 } = options;
    const query: any = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(query)
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.conversationModel.countDocuments(query),
    ]);

    return { conversations, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // Get messages for a conversation
  async getMessages(
    conversationId: string,
    userId: string,
    userType: 'admin' | 'super_admin',
    shopId?: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 50 } = options;

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify access
    if (userType === 'admin' && shopId && conversation.shopId.toString() !== shopId) {
      throw new ForbiddenException('Access denied');
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversationId: new Types.ObjectId(conversationId), deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({ 
        conversationId: new Types.ObjectId(conversationId), 
        deleted: { $ne: true } 
      }),
    ]);

    return { 
      messages: messages.reverse(), // Return in chronological order
      total, 
      page, 
      limit, 
      pages: Math.ceil(total / limit),
      conversation,
    };
  }

  // Mark messages as read
  async markAsRead(
    conversationId: string,
    userId: string,
    userType: 'admin' | 'super_admin',
  ) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark all unread messages from the other party as read
    const otherSenderType = userType === 'admin' ? 'super_admin' : 'admin';
    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderType: otherSenderType,
        status: { $ne: 'read' },
      },
      {
        status: 'read',
        readAt: new Date(),
        readBy: new Types.ObjectId(userId),
      },
    );

    // Reset unread count
    const updateField = userType === 'admin' ? 'unreadCountAdmin' : 'unreadCountSuperAdmin';
    await this.conversationModel.findByIdAndUpdate(conversationId, { [updateField]: 0 });

    return { success: true };
  }

  // Update conversation (super admin can assign, change status, etc.)
  async updateConversation(
    conversationId: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationDocument> {
    const update: any = { ...dto };
    
    if (dto.status === 'resolved') {
      update.resolvedAt = new Date();
    }

    if (dto.superAdminId) {
      update.superAdminId = new Types.ObjectId(dto.superAdminId);
    }

    const conversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      update,
      { new: true },
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  // Get unread counts
  async getUnreadCount(userId: string, userType: 'admin' | 'super_admin', shopId?: string) {
    if (userType === 'admin' && shopId) {
      const result = await this.conversationModel.aggregate([
        { $match: { shopId: new Types.ObjectId(shopId) } },
        { $group: { _id: null, total: { $sum: '$unreadCountAdmin' } } },
      ]);
      return { unreadCount: result[0]?.total || 0 };
    } else {
      const result = await this.conversationModel.aggregate([
        { $group: { _id: null, total: { $sum: '$unreadCountSuperAdmin' } } },
      ]);
      return { unreadCount: result[0]?.total || 0 };
    }
  }

  // Get single conversation
  async getConversation(conversationId: string): Promise<ConversationDocument | null> {
    return this.conversationModel.findById(conversationId);
  }
}
